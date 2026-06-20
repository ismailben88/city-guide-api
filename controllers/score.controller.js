const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Score        = require("../models/Score");
const Place        = require("../models/Place");
const GuideProfile = require("../models/GuideProfile");
const mongoose     = require("mongoose");
const { recalcRating } = require("../services/rating.service");

const SCORE_MODELS = { Place, GuideProfile };

// GET /scores?targetId=&targetType=
exports.getScores = asyncHandler(async (req, res) => {
  const { targetId, targetType } = req.query;
  // Require a target — without it this returned every score in the DB (an
  // unbounded scan). Scores are always read per-target by the frontend.
  if (!targetId) throw new ApiError(400, "targetId requis");

  const filter = { targetId };
  if (targetType) filter.targetType = targetType;

  const scores = await Score.find(filter)
    .populate("authorId", "firstName lastName avatarUrl")
    .limit(1000);
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

  if (!SCORE_MODELS[targetType]) throw new ApiError(400, "targetType invalide");
  if (!mongoose.isValidObjectId(targetId)) throw new ApiError(400, "targetId invalide");

  const result = await Score.findOneAndUpdate(
    { targetId, targetType, authorId: req.user._id },
    { score },
    { new: true, upsert: true, runValidators: true }
  );
  // Keep the denormalised averageRating in sync — Score is the source of truth.
  await recalcRating(targetId, targetType);
  res.status(201).json(result);
});

// DELETE /scores/:id
exports.deleteScore = asyncHandler(async (req, res) => {
  const deleted = await Score.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Score introuvable");
  await recalcRating(deleted.targetId, deleted.targetType);
  res.json({ message: "Score supprimé" });
});
