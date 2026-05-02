const { Schema, model, Types } = require("mongoose");

const favoriteSchema = new Schema(
  {
    userId:     { type: Types.ObjectId, ref: "User",     required: true },
    targetId:   { type: Types.ObjectId, required: true,  refPath: "targetType" },
    targetType: { type: String, required: true, enum: ["Place", "GuideProfile", "Event"] },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });

module.exports = model("Favorite", favoriteSchema);
