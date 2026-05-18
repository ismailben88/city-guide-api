const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Comment      = require("../models/Comment");
const Score        = require("../models/Score");

const SCORE_TARGETS = ["Place", "GuideProfile"];

async function upsertScore(targetId, targetType, authorId, rating) {
  if (!SCORE_TARGETS.includes(targetType) || !rating || rating < 1) return;
  await Score.findOneAndUpdate(
    { targetId, targetType, authorId },
    { score: rating },
    { upsert: true, new: true, runValidators: true }
  );
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
  const comment = await Comment.create({ ...req.body, authorId: req.user._id });
  await comment.populate("authorId", "firstName lastName avatarUrl");
  await upsertScore(req.body.targetId, req.body.targetType, req.user._id, req.body.rating);
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
  await Comment.findByIdAndUpdate(req.params.id, { status: "deleted" });
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
