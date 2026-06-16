const { Schema, model, Types } = require("mongoose");

// One like per (comment, user). The unique index makes likes idempotent and
// keeps Comment.likeCount = count of these documents (never negative).
const commentLikeSchema = new Schema(
  {
    commentId: { type: Types.ObjectId, ref: "Comment", required: true },
    userId:    { type: Types.ObjectId, ref: "User",    required: true },
  },
  { timestamps: true }
);

commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

module.exports = model("CommentLike", commentLikeSchema);
