const { Schema, model } = require("mongoose");

const commentSchema = new Schema(
  {
    targetId:        { type: Schema.Types.Mixed, required: true },
    targetType:      { type: String, required: true, enum: ["Place", "GuideProfile", "Event", "website"] },
    authorId:        { type: Schema.Types.ObjectId, ref: "User", required: true },
    content:         { type: String, required: true, maxlength: 1000, trim: true },
    rating:          { type: Number, default: 0, min: 0, max: 5 },
    parentCommentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    status:          { type: String, enum: ["active", "deleted", "flagged"], default: "active" },
    likeCount:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ targetId: 1, targetType: 1, parentCommentId: 1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ status: 1 });

module.exports = model("Comment", commentSchema);
