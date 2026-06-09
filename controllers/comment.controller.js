const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Comment      = require("../models/Comment");
const Score        = require("../models/Score");
const Place        = require("../models/Place");
const GuideProfile = require("../models/GuideProfile");
const Event        = require("../models/Event");
const notify       = require("../helpers/notify");
const { Types }    = require("mongoose");

const SCORE_TARGETS = ["Place", "GuideProfile"];

async function upsertScore(targetId, targetType, authorId, rating) {
  if (!SCORE_TARGETS.includes(targetType) || !rating || rating < 1) return false;
  await Score.findOneAndUpdate(
    { targetId, targetType, authorId },
    { $set: { score: rating } },
    { upsert: true, new: true, runValidators: true }
  );
  return true;
}

// Recalculate and persist averageRating (from scored reviews) + reviewCount
// (all active top-level comments) on Place or GuideProfile.
// Always awaited before the HTTP response so the frontend refetch sees fresh data.
async function recalcRating(targetId, targetType) {
  if (!SCORE_TARGETS.includes(targetType)) return;
  const objId = new Types.ObjectId(targetId);
  const commentFilter = {
    targetId: { $in: [String(objId), objId] },
    targetType, parentCommentId: null, status: "active",
  };
  const [scoreStats, commentCount] = await Promise.all([
    Score.aggregate([
      { $match: { targetId: objId, targetType } },
      { $group: { _id: null, avg: { $avg: "$score" } } },
    ]),
    Comment.countDocuments(commentFilter),
  ]);
  const avg   = scoreStats[0] ? +scoreStats[0].avg.toFixed(2) : 0;
  const Model = targetType === "Place" ? Place : GuideProfile;
  await Model.findByIdAndUpdate(targetId, { averageRating: avg, reviewCount: commentCount });
}

// Resolves the owner userId and display name for any comment target entity
async function getEntityOwner(targetId, targetType) {
  try {
    if (targetType === "Place") {
      const place = await Place.findById(targetId).select("ownerId name").lean();
      return place?.ownerId ? { ownerId: place.ownerId, entityName: place.name } : null;
    }
    if (targetType === "GuideProfile") {
      const guide = await GuideProfile.findById(targetId).select("userId").lean();
      return guide?.userId ? { ownerId: guide.userId, entityName: "your guide profile" } : null;
    }
    if (targetType === "Event") {
      const event = await Event.findById(targetId).select("organizedBy title").lean();
      return event?.organizedBy ? { ownerId: event.organizedBy, entityName: event.title } : null;
    }
  } catch {
    // never block on notification lookup failure
  }
  return null;
}

// GET /comments?targetId=&targetType=&parentCommentId=
// Comment.targetId is Schema.Types.Mixed → historic docs store it as String,
// new docs as ObjectId. Match both forms so seed + live data coexist.
exports.getComments = asyncHandler(async (req, res) => {
  const { targetId, targetType, parentCommentId } = req.query;
  const filter = { status: "active" };
  if (targetId && targetId !== "undefined") {
    if (Types.ObjectId.isValid(targetId) && String(new Types.ObjectId(targetId)) === targetId) {
      filter.targetId = { $in: [targetId, new Types.ObjectId(targetId)] };
    } else {
      filter.targetId = targetId;
    }
  }
  if (targetType && targetType !== "undefined") filter.targetType = targetType;
  filter.parentCommentId = parentCommentId || null;

  const comments = await Comment.find(filter)
    .populate("authorId", "firstName lastName avatarUrl")
    .sort({ createdAt: -1 });

  res.json(comments);
});

// POST /comments
exports.postComment = asyncHandler(async (req, res) => {
  const { targetId, targetType, parentCommentId, rating } = req.body;

  // Normalize targetId to ObjectId for SCORE_TARGETS so all docs share one form
  const normalizedTargetId = SCORE_TARGETS.includes(targetType) && Types.ObjectId.isValid(targetId)
    ? new Types.ObjectId(targetId)
    : targetId;

  // Self-review guard: top-level reviews only, skip for website-level reviews
  if (!parentCommentId && targetType !== "website") {
    const entity = await getEntityOwner(targetId, targetType);
    if (entity?.ownerId && entity.ownerId.toString() === req.user._id.toString()) {
      throw new ApiError(403, "You cannot review your own listing");
    }
  }

  // One website review per user
  if (targetType === "website" && !parentCommentId) {
    const existing = await Comment.findOne({
      targetId, targetType, authorId: req.user._id, status: "active",
    });
    if (existing) throw new ApiError(409, "You have already submitted a review.");
  }

  const comment = await Comment.create({ ...req.body, targetId: normalizedTargetId, authorId: req.user._id });
  await comment.populate("authorId", "firstName lastName avatarUrl");
  await upsertScore(targetId, targetType, req.user._id, rating);
  // Recalc for every top-level comment so reviewCount always reflects the full count.
  if (!parentCommentId) await recalcRating(targetId, targetType);

  // Fire-and-forget notifications (never block the HTTP response)
  const authorName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || "Someone";

  if (!parentCommentId) {
    // Top-level review/comment → notify entity owner (fire-and-forget)
    getEntityOwner(targetId, targetType).then((entity) => {
      if (!entity?.ownerId) return;
      notify.newReview(entity.ownerId, authorName, entity.entityName, targetId, req.user._id, targetType)
        .catch(() => {});
    }).catch(() => {});
  } else {
    // Reply → notify parent comment author
    Comment.findById(parentCommentId).select("authorId content").lean()
      .then((parent) => {
        if (!parent?.authorId) return;
        if (parent.authorId.toString() === req.user._id.toString()) return; // don't self-notify
        const targetPath = { Place: "places", GuideProfile: "guides", Event: "events" }[targetType] || "places";
        const snippet    = (parent.content || "").slice(0, 50);
        notify.communityReply(
          parent.authorId,
          authorName,
          snippet,
          `/${targetPath}/${targetId}`,
          req.user._id
        ).catch(() => {});
      }).catch(() => {});
  }

  res.status(201).json(comment);
});

// PUT /comments/:id
exports.updateComment = asyncHandler(async (req, res) => {
  const update = { content: req.body.content };
  if (req.body.rating !== undefined) update.rating = req.body.rating;
  const comment = await Comment.findOneAndUpdate(
    { _id: req.params.id, authorId: req.user._id },
    update,
    { new: true, runValidators: true }
  );
  if (!comment) throw new ApiError(404, "Commentaire introuvable ou non autorisé");
  const scoreUpdated = await upsertScore(comment.targetId, comment.targetType, req.user._id, req.body.rating);
  if (scoreUpdated) await recalcRating(comment.targetId, comment.targetType);
  res.json(comment);
});

// DELETE /comments/:id
exports.deleteComment = asyncHandler(async (req, res) => {
  // Only the author (or admin) may delete; use findOneAndUpdate to enforce ownership atomically
  const query = req.user.role === "admin"
    ? { _id: req.params.id }
    : { _id: req.params.id, authorId: req.user._id };

  const comment = await Comment.findOneAndUpdate(query, { status: "deleted" }, { new: true });
  if (!comment) throw new ApiError(404, "Commentaire introuvable ou non autorisé");

  // Remove the associated Score and immediately recalculate averageRating
  if ((comment.rating ?? 0) > 0) {
    await Score.findOneAndDelete({
      targetId:   comment.targetId,
      targetType: comment.targetType,
      authorId:   comment.authorId,
    });
    await recalcRating(comment.targetId, comment.targetType);
  }

  res.json({ message: "Commentaire supprimé" });
});

// PATCH /comments/:id — toggle like
// Body: { delta: 1 } to like, { delta: -1 } to unlike
exports.toggleLike = asyncHandler(async (req, res) => {
  const delta = req.body.delta === -1 ? -1 : 1;
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { $inc: { likeCount: delta } },
    { new: true }
  );
  if (!comment) throw new ApiError(404, "Commentaire introuvable");
  res.json({ likeCount: comment.likeCount });
});
