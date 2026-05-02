const Favorite = require("../model/Favorite");

// GET /favorites?userId=&targetType=&targetId=
exports.getFavorites = async (req, res, next) => {
  try {
    const { userId, targetType, targetId } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const favorites = await Favorite.find(filter).sort({ createdAt: -1 });
    res.json(favorites);
  } catch (err) { next(err); }
};

// POST /favorites
exports.addFavorite = async (req, res, next) => {
  try {
    const { targetId, targetType } = req.body;
    const favorite = await Favorite.create({
      userId: req.user._id,
      targetId,
      targetType,
    });
    res.status(201).json(favorite);
  } catch (err) {
    // Doublon → déjà en favoris
    if (err.code === 11000)
      return res.status(400).json({ message: "Déjà dans les favoris" });
    next(err);
  }
};

// DELETE /favorites/:id
exports.deleteFavorite = async (req, res, next) => {
  try {
    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: "Retiré des favoris" });
  } catch (err) { next(err); }
};
