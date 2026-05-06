const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Score        = require("../models/Score");
const mongoose     = require("mongoose");

// GET /scores?targetId=&targetType=
exports.getScores = asyncHandler(async (req, res) => {
  const { targetId, targetType } = req.query;
  const filter = {};
  if (targetId)   filter.targetId   = targetId;
  if (targetType) filter.targetType = targetType;

  const scores = await Score.find(filter).populate("authorId", "firstName lastName avatarUrl");
  res.json(scores);
});

// GET /scores/analytics?targetId=&targetType=
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { targetId, targetType } = req.query;
  if (!mongoose.isValidObjectId(targetId)) throw new ApiError(400, "targetId invalide");

  const stats = await Score.aggregate([
    { $match: { targetId: new mongoose.Types.ObjectId(targetId), targetType } },
    { $group: { _id: "$score", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const avg   = total ? stats.reduce((sum, s) => sum + s._id * s.count, 0) / total : 0;

  res.json({ distribution: stats, average: +avg.toFixed(2), total });
});

// POST /scores — upsert : un seul score par utilisateur par cible
exports.submitScore = asyncHandler(async (req, res) => {
  const { targetId, targetType, score } = req.body;
  const result = await Score.findOneAndUpdate(
    { targetId, targetType, authorId: req.user._id },
    { score },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(201).json(result);
});

// DELETE /scores/:id
exports.deleteScore = asyncHandler(async (req, res) => {
  await Score.findByIdAndDelete(req.params.id);
  res.json({ message: "Score supprimé" });
});
