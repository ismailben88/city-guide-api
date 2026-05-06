const { verifyToken } = require("../utils/jwt.utils");
const User            = require("../models/User");
const ApiError        = require("../utils/ApiError");
const asyncHandler    = require("../utils/asyncHandler");

// Vérifie le JWT et attache req.user
const protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new ApiError(401, "Non authentifié");

  const decoded = verifyToken(token);
  const user    = await User.findById(decoded.id);
  if (!user)       throw new ApiError(401, "Utilisateur introuvable");
  if (!user.isActive) throw new ApiError(403, "Compte désactivé");

  req.user = user;
  next();
});

// Restreint l'accès aux rôles spécifiés
const restrict = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return next(new ApiError(403, "Accès refusé"));
  next();
};

module.exports = { protect, restrict };
