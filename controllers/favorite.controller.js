const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Favorite     = require("../models/Favorite");

// GET /favorites — returns the authenticated user's own favorites
exports.getFavorites = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.query;
  const filter = { userId: req.user._id };
  if (targetType) filter.targetType = targetType;
  if (targetId)   filter.targetId   = targetId;

  const favorites = await Favorite.find(filter).sort({ createdAt: -1 });
  res.json(favorites);
});

// POST /favorites
exports.addFavorite = asyncHandler(async (req, res) => {
  const { targetId, targetType } = req.body;
  try {
    const favorite = await Favorite.create({ userId: req.user._id, targetId, targetType });
    res.status(201).json(favorite);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(400, "Déjà dans les favoris");
    throw err;
  }
});

// DELETE /favorites/:id
exports.deleteFavorite = asyncHandler(async (req, res) => {
  await Favorite.findByIdAndDelete(req.params.id);
  res.json({ message: "Retiré des favoris" });
});
