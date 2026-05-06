const asyncHandler               = require("../utils/asyncHandler");
const { signToken, verifyToken } = require("../utils/jwt.utils");
const { registerUser, loginUser } = require("../services/auth.service");
const User = require("../models/User");

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

// POST /auth/logout
exports.logout = (req, res) => res.json({ message: "Déconnecté" });

// POST /auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = verifyToken(refreshToken);
  const token   = signToken(decoded.id);
  res.json({ token });
});

// GET /auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user);
});
