const { Schema, model, Types } = require("mongoose");

const scoreSchema = new Schema(
  {
    targetId:   { type: Types.ObjectId, required: true, refPath: "targetType" },
    targetType: { type: String, required: true, enum: ["Place", "GuideProfile"] },
    score:      { type: Number, required: true, min: 1, max: 5 },
    authorId:   { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

scoreSchema.index({ targetId: 1, targetType: 1, authorId: 1 }, { unique: true });

module.exports = model("Score", scoreSchema);
