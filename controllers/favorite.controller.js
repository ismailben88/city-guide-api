const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Favorite     = require("../models/Favorite");

// GET /favorites — returns the authenticated user's own favorites
exports.getFavorites = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.query;
  const filter = { userId: req.user._id };
  if (targetType) filter.targetType = targetType;
  if (targetId)   filter.targetId   = targetId;

  const favorites = await Favorite.find(filter)
    .populate("targetId")
    .sort({ createdAt: -1 });
  res.json(favorites);
});

// POST /favorites
exports.addFavorite = asyncHandler(async (req, res) => {
  const { targetId, targetType } = req.body;
  if (!targetId || !targetType) throw new ApiError(400, "targetId and targetType are required");
  try {
    const favorite = await Favorite.create({ userId: req.user._id, targetId, targetType });
    res.status(201).json(favorite);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(400, "Déjà dans les favoris");
    throw err;
  }
});

// DELETE /favorites/:id
// SECURITY: scoped by both _id AND userId to prevent IDOR — a user with a
// known favorite ID belonging to someone else must not be able to delete it.
exports.deleteFavorite = asyncHandler(async (req, res) => {
  const deleted = await Favorite.findOneAndDelete({
    _id:    req.params.id,
    userId: req.user._id,
  });
  if (!deleted) throw new ApiError(404, "Favori introuvable");
  res.json({ message: "Retiré des favoris" });
});
