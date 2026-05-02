const Comment = require("../model/Comment");

// GET /comments?targetId=&targetType=&parentCommentId=
exports.getComments = async (req, res, next) => {
  try {
    const { targetId, targetType, parentCommentId } = req.query;
    const filter = { status: "active" };
    if (targetId   && targetId   !== "undefined") filter.targetId   = targetId;
    if (targetType && targetType !== "undefined") filter.targetType = targetType;
    // null → commentaires racines ; fourni → réponses
    filter.parentCommentId = parentCommentId || null;

    const comments = await Comment.find(filter)
      .populate("authorId", "firstName lastName avatarUrl")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) { next(err); }
};

// POST /comments
exports.postComment = async (req, res, next) => {
  try {
    const comment = await Comment.create({
      ...req.body,
      authorId: req.user._id,
    });
    await comment.populate("authorId", "firstName lastName avatarUrl");
    res.status(201).json(comment);
  } catch (err) { next(err); }
};

// PUT /comments/:id
exports.updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, authorId: req.user._id },
      { content: req.body.content },
      { new: true, runValidators: true }
    );
    if (!comment) return res.status(404).json({ message: "Commentaire introuvable" });
    res.json(comment);
  } catch (err) { next(err); }
};

// DELETE /comments/:id
exports.deleteComment = async (req, res, next) => {
  try {
    await Comment.findByIdAndUpdate(req.params.id, { status: "deleted" });
    res.json({ message: "Commentaire supprimé" });
  } catch (err) { next(err); }
};

// PATCH /comments/:id  — toggle like
exports.toggleLike = async (req, res, next) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { likeCount: req.body.likes },
      { new: true }
    );
    res.json({ likeCount: comment.likeCount });
  } catch (err) { next(err); }
};
