const { Schema, model, Types } = require("mongoose");

const commentSchema = new Schema(
  {
    targetId:        { type: Types.ObjectId, required: true, refPath: "targetType" },
    targetType:      { type: String, required: true, enum: ["Place", "GuideProfile", "Event"] },
    authorId:        { type: Types.ObjectId, ref: "User", required: true },
    content:         { type: String, required: true, maxlength: 1000, trim: true },
    parentCommentId: { type: Types.ObjectId, ref: "Comment", default: null },
    status:          { type: String, enum: ["active", "deleted", "flagged"], default: "active" },
    likeCount:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ targetId: 1, targetType: 1, parentCommentId: 1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ status: 1 });

module.exports = model("Comment", commentSchema);
