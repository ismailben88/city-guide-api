const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Comment      = require("../models/Comment");
const Score        = require("../models/Score");
const Place        = require("../models/Place");
const GuideProfile = require("../models/GuideProfile");
const Event        = require("../models/Event");
const notify       = require("../helpers/notify");

const SCORE_TARGETS = ["Place", "GuideProfile"];

async function upsertScore(targetId, targetType, authorId, rating) {
  if (!SCORE_TARGETS.includes(targetType) || !rating || rating < 1) return;
  await Score.findOneAndUpdate(
    { targetId, targetType, authorId },
    { score: rating },
    { upsert: true, new: true, runValidators: true }
  );
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
exports.getComments = asyncHandler(async (req, res) => {
  const { targetId, targetType, parentCommentId } = req.query;
  const filter = { status: "active" };
  if (targetId   && targetId   !== "undefined") filter.targetId   = targetId;
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

  // Self-review guard: top-level reviews only (replies are allowed from anyone)
  if (!parentCommentId) {
    const entity = await getEntityOwner(targetId, targetType);
    if (entity?.ownerId && entity.ownerId.toString() === req.user._id.toString()) {
      throw new ApiError(403, "You cannot review your own listing");
    }
  }

  const comment = await Comment.create({ ...req.body, authorId: req.user._id });
  await comment.populate("authorId", "firstName lastName avatarUrl");
  await upsertScore(targetId, targetType, req.user._id, rating);

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
  await upsertScore(comment.targetId, comment.targetType, req.user._id, req.body.rating);
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

  // Remove the associated Score entry so averageRating recalculates correctly
  if ((comment.rating ?? 0) > 0) {
    await Score.findOneAndDelete({
      targetId:   comment.targetId,
      targetType: comment.targetType,
      authorId:   comment.authorId,
    });
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
