const { Types }    = require("mongoose");
const Score        = require("../models/Score");
const Comment      = require("../models/Comment");
const Place        = require("../models/Place");
const GuideProfile = require("../models/GuideProfile");

// Targets that carry an aggregated star rating.
const SCORE_TARGETS = ["Place", "GuideProfile"];

// Create/update the single (target, author) score. Returns false when the
// rating is absent or below 1 (nothing to persist).
async function upsertScore(targetId, targetType, authorId, rating) {
  if (!SCORE_TARGETS.includes(targetType) || !rating || rating < 1) return false;
  await Score.findOneAndUpdate(
    { targetId, targetType, authorId },
    { $set: { score: rating } },
    { upsert: true, new: true, runValidators: true }
  );
  return true;
}

// Remove a user's score for a target (used when a review is deleted or its
// rating is cleared). Returns true when a score document was removed.
async function removeScore(targetId, targetType, authorId) {
  if (!SCORE_TARGETS.includes(targetType)) return false;
  const res = await Score.findOneAndDelete({ targetId, targetType, authorId });
  return !!res;
}

// Recalculate and persist averageRating (mean of Score docs) + reviewCount
// (active top-level comments) on Place or GuideProfile. Single source of truth
// for the denormalised rating fields — call this after ANY change to a Score
// or to a top-level Comment's visibility.
async function recalcRating(targetId, targetType) {
  if (!SCORE_TARGETS.includes(targetType)) return;
  const objId = new Types.ObjectId(targetId);
  const commentFilter = {
    targetId: { $in: [String(objId), objId] },
    targetType, parentCommentId: null, status: "active",
  };
  const [scoreStats, commentCount] = await Promise.all([
    Score.aggregate([
      { $match: { targetId: objId, targetType } },
      { $group: { _id: null, avg: { $avg: "$score" } } },
    ]),
    Comment.countDocuments(commentFilter),
  ]);
  const avg   = scoreStats[0] ? +scoreStats[0].avg.toFixed(2) : 0;
  const Model = targetType === "Place" ? Place : GuideProfile;
  await Model.findByIdAndUpdate(targetId, { averageRating: avg, reviewCount: commentCount });
}

module.exports = { SCORE_TARGETS, upsertScore, removeScore, recalcRating };
