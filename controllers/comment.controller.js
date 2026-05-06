const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Comment      = require("../models/Comment");

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
  res.status(201).json(comment);
});

// PUT /comments/:id
exports.updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOneAndUpdate(
    { _id: req.params.id, authorId: req.user._id },
    { content: req.body.content },
    { new: true, runValidators: true }
  );
  if (!comment) throw new ApiError(404, "Commentaire introuvable ou non autorisé");
  res.json(comment);
});

// DELETE /comments/:id
exports.deleteComment = asyncHandler(async (req, res) => {
  await Comment.findByIdAndUpdate(req.params.id, { status: "deleted" });
  res.json({ message: "Commentaire supprimé" });
});

// PATCH /comments/:id — toggle like
exports.toggleLike = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { likeCount: req.body.likes },
    { new: true }
  );
  if (!comment) throw new ApiError(404, "Commentaire introuvable");
  res.json({ likeCount: comment.likeCount });
});
