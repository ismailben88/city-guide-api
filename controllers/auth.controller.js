const asyncHandler               = require("../utils/asyncHandler");
const { signToken, verifyToken } = require("../utils/jwt.utils");
const { registerUser, loginUser, googleAuth, facebookAuth } = require("../services/auth.service");
const User     = require("../models/User");
const ApiError = require("../utils/ApiError");

// POST /auth/register
exports.register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
});

// POST /auth/login
exports.login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  res.json(result);
});

// POST /auth/google
exports.googleAuth = asyncHandler(async (req, res) => {
  const { googleId, email, name, avatar } = req.body;
  if (!googleId || !email) throw new ApiError(400, "googleId and email are required");
  const result = await googleAuth({ googleId, email, name, avatar });
  res.json(result);
});

// POST /auth/facebook
exports.facebookAuth = asyncHandler(async (req, res) => {
  const { facebookId, email, name, avatar } = req.body;
  if (!facebookId || !email) throw new ApiError(400, "facebookId and email are required");
  const result = await facebookAuth({ facebookId, email, name, avatar });
  res.json(result);
});

// POST /auth/logout
exports.logout = (req, res) => res.json({ message: "Déconnecté" });

// POST /auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "refreshToken requis");
  const decoded = verifyToken(refreshToken);
  // Validate the user still exists, is active, and the token wasn't revoked
  // (stale tokenVersion) before minting a fresh one.
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new ApiError(401, "Utilisateur invalide");
  if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0))
    throw new ApiError(401, "Session expirée, veuillez vous reconnecter");
  res.json({ token: signToken(user) });
});

// GET /auth/me — req.user already populated by protect middleware, no extra DB query needed
exports.getMe = (req, res) => res.json(req.user);
