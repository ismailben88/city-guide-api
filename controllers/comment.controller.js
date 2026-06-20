const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Comment      = require("../models/Comment");
const CommentLike  = require("../models/CommentLike");
const Place        = require("../models/Place");
const GuideProfile = require("../models/GuideProfile");
const Event        = require("../models/Event");
const notify       = require("../helpers/notify");
const { Types }    = require("mongoose");
const { SCORE_TARGETS, upsertScore, removeScore, recalcRating } = require("../services/rating.service");

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
// Hard cap so a single request can never scan/return the whole collection.
const COMMENTS_MAX = 500;

exports.getComments = asyncHandler(async (req, res) => {
  const { targetId, targetType, parentCommentId } = req.query;
  const hasTarget = targetId && targetId !== "undefined";
  const hasParent = parentCommentId && parentCommentId !== "undefined";

  // Require a scope — without one this used to return every active comment in
  // the DB (an unbounded scan / accidental data dump). The public callers always
  // pass either a targetId (a listing's reviews) or a parentCommentId (replies).
  if (!hasTarget && !hasParent) {
    throw new ApiError(400, "targetId ou parentCommentId requis");
  }

  const filter = { status: "active" };
  if (hasTarget) {
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
    .sort({ createdAt: -1 })
    .limit(COMMENTS_MAX)
    .lean();

  // Annotate `likedByMe` for the authenticated reader so the like button can
  // show + toggle the correct state (likes live in CommentLike, not on the doc).
  if (req.user && comments.length) {
    const likedIds = await CommentLike.find({
      userId: req.user._id,
      commentId: { $in: comments.map((c) => c._id) },
    }).select("commentId").lean();
    const likedSet = new Set(likedIds.map((l) => l.commentId.toString()));
    comments.forEach((c) => { c.likedByMe = likedSet.has(c._id.toString()); });
  } else {
    comments.forEach((c) => { c.likedByMe = false; });
  }

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

  // One top-level review per user per target. Replies (parentCommentId) are
  // unlimited; only top-level reviews are capped so reviewCount === unique
  // reviewers and a single Score per (target, author) stays consistent.
  if (!parentCommentId) {
    const existing = await Comment.findOne({
      targetId: SCORE_TARGETS.includes(targetType) && Types.ObjectId.isValid(targetId)
        ? { $in: [targetId, new Types.ObjectId(targetId)] }
        : targetId,
      targetType, authorId: req.user._id, status: "active",
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
  // Reconcile the Score with the edited rating: a positive rating upserts it,
  // clearing the rating (0 / falsy) removes it so the mean reflects reality.
  if (req.body.rating !== undefined) {
    const changed = Number(req.body.rating) >= 1
      ? await upsertScore(comment.targetId, comment.targetType, req.user._id, req.body.rating)
      : await removeScore(comment.targetId, comment.targetType, req.user._id);
    if (changed) await recalcRating(comment.targetId, comment.targetType);
  }
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
    await removeScore(comment.targetId, comment.targetType, comment.authorId);
    await recalcRating(comment.targetId, comment.targetType);
  }

  res.json({ message: "Commentaire supprimé" });
});

// PATCH /comments/:id — toggle like (idempotent, per-user)
// Body: { delta: 1 } to like, { delta: -1 } to unlike. The like is tracked per
// user in CommentLike, so repeated calls can't inflate the count and likeCount
// can never go negative (it's recomputed from the actual like documents).
exports.toggleLike = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id).select("_id");
  if (!comment) throw new ApiError(404, "Commentaire introuvable");

  const wantsLike = req.body.delta !== -1;
  if (wantsLike) {
    // upsert — duplicate key (already liked) is a no-op
    await CommentLike.updateOne(
      { commentId: comment._id, userId: req.user._id },
      { $setOnInsert: { commentId: comment._id, userId: req.user._id } },
      { upsert: true }
    );
  } else {
    await CommentLike.deleteOne({ commentId: comment._id, userId: req.user._id });
  }

  const likeCount = await CommentLike.countDocuments({ commentId: comment._id });
  await Comment.findByIdAndUpdate(comment._id, { likeCount });
  res.json({ likeCount, liked: wantsLike });
});
