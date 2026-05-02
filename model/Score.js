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

// Lazy require pour éviter les dépendances circulaires
async function updateRunningTotals(targetId, targetType) {
  const Score = require("./Score");
  const stats = await Score.aggregate([
    { $match: { targetId: new Types.ObjectId(targetId), targetType } },
    { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
  ]);
  const avg   = stats[0] ? +stats[0].avg.toFixed(2) : 0;
  const count = stats[0] ? stats[0].count : 0;

  const TargetModel = targetType === "Place"
    ? require("./Place")
    : require("./GuideProfile");

  await TargetModel.findByIdAndUpdate(targetId, { averageRating: avg, reviewCount: count });
}

scoreSchema.post("save",             function ()    { updateRunningTotals(this.targetId, this.targetType); });
scoreSchema.post("findOneAndUpdate", function (doc) { if (doc) updateRunningTotals(doc.targetId, doc.targetType); });
scoreSchema.post("findOneAndDelete", function (doc) { if (doc) updateRunningTotals(doc.targetId, doc.targetType); });

module.exports = model("Score", scoreSchema);
