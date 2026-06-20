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
  // Token revocation: a stale `tv` means the token was issued before a
  // security event (e.g. password change) bumped the user's tokenVersion.
  if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0))
    throw new ApiError(401, "Session expirée, veuillez vous reconnecter");

  req.user = user;
  next();
});

// Auth facultative : attache req.user si un token valide est présent, sinon
// poursuit en anonyme (ne lève jamais). Utile pour les routes publiques qui
// élargissent la réponse pour le propriétaire/admin.
const optionalProtect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    const decoded = verifyToken(token);
    const user    = await User.findById(decoded.id);
    if (user && user.isActive && (decoded.tv ?? 0) === (user.tokenVersion ?? 0)) {
      req.user = user;
    }
  } catch {
    // token invalide/expiré → on reste anonyme
  }
  next();
});

// Restreint l'accès aux rôles spécifiés
const restrict = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return next(new ApiError(403, "Accès refusé"));
  next();
};

module.exports = { protect, optionalProtect, restrict };
