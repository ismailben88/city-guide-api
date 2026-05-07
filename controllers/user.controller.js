const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const userService  = require("../services/user.service");

// GET /users
exports.getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getUsers(req.query);
  res.json(result);
});

// GET /users/:id
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
});

// PUT /users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json(user);
});

// PATCH /users/:id/role  (admin only)
exports.updateRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const VALID_ROLES = ["visitor", "user", "guide", "entrepreneur", "admin"];
  if (!role || !VALID_ROLES.includes(role)) throw new ApiError(400, "Invalid role");
  const User = require("../models/User");
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw new ApiError(404, "User not found");
  res.json(user);
});

// DELETE /users/:id — désactivation douce
exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.params.id);
  res.json({ message: "User deactivated" });
});

// POST /users/:id/avatar  (multipart/form-data — champ "avatar")
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Aucun fichier reçu");
  const origin    = `${req.protocol}://${req.get("host")}`;
  const avatarUrl = `${origin}/uploads/${req.file.filename}`;
  const url       = await userService.setAvatarUrl(req.params.id, avatarUrl);
  res.json({ avatarUrl: url });
});

// POST /users/:id/linked-accounts
exports.addLinkedAccount = asyncHandler(async (req, res) => {
  const accounts = await userService.addLinkedAccount(req.params.id, req.body);
  res.json(accounts);
});

// DELETE /users/:id/linked-accounts/:provider
exports.removeLinkedAccount = asyncHandler(async (req, res) => {
  const accounts = await userService.removeLinkedAccount(req.params.id, req.params.provider);
  res.json(accounts);
});

// PATCH /users/me/password
exports.changeMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    throw new ApiError(400, "currentPassword and newPassword are required");
  await userService.changePassword(req.user._id, currentPassword, newPassword);
  res.json({ message: "Password updated successfully" });
});

// DELETE /users/me — self-service account deactivation
exports.deleteMyAccount = asyncHandler(async (req, res) => {
  await userService.deactivateMyAccount(req.user._id);
  res.json({ message: "Account deactivated" });
});
