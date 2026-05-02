const Score    = require("../model/Score");
const mongoose = require("mongoose");

// GET /scores?targetId=&targetType=
exports.getScores = async (req, res, next) => {
  try {
    const { targetId, targetType } = req.query;
    const filter = {};
    if (targetId) filter.targetId = targetId;
    if (targetType) filter.targetType = targetType;

    const scores = await Score.find(filter).populate("authorId", "firstName lastName avatarUrl");
    res.json(scores);
  } catch (err) { next(err); }
};

// GET /scores/analytics?targetId=&targetType=
exports.getAnalytics = async (req, res, next) => {
  try {
    const { targetId, targetType } = req.query;

    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "targetId invalide" });

    const stats = await Score.aggregate([
      { $match: { targetId: new mongoose.Types.ObjectId(targetId), targetType } },
      {
        $group: {
          _id: "$score",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const avg = total
      ? stats.reduce((sum, s) => sum + s._id * s.count, 0) / total
      : 0;

    res.json({ distribution: stats, average: +avg.toFixed(2), total });
  } catch (err) { next(err); }
};

// POST /scores
exports.submitScore = async (req, res, next) => {
  try {
    const { targetId, targetType, score } = req.body;

    // Upsert : un seul score par user par cible
    const result = await Score.findOneAndUpdate(
      { targetId, targetType, authorId: req.user._id },
      { score },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(result);
  } catch (err) { next(err); }
};

// DELETE /scores/:id
exports.deleteScore = async (req, res, next) => {
  try {
    await Score.findByIdAndDelete(req.params.id);
    res.json({ message: "Score supprimé" });
  } catch (err) { next(err); }
};
