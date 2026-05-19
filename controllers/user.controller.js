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

// Shared ownership guard — caller must be the target user or an admin
function assertOwnership(req) {
  if (req.params.id !== req.user._id.toString() && req.user.role !== "admin")
    throw new ApiError(403, "Accès refusé");
}

// PUT /users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  assertOwnership(req);
  const user = await userService.updateUser(req.params.id, req.body);
  res.json(user);
});

// PATCH /users/:id/role  (admin only)
exports.updateRole = asyncHandler(async (req, res) => {
  const user = await userService.updateRole(req.params.id, req.body.role);
  res.json(user);
});

// DELETE /users/:id — soft deactivation
exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.params.id);
  res.json({ message: "User deactivated" });
});

// POST /users/:id/avatar  (multipart/form-data — champ "avatar")
exports.uploadAvatar = asyncHandler(async (req, res) => {
  assertOwnership(req);
  if (!req.file) throw new ApiError(400, "Aucun fichier reçu");
  const origin    = `${req.protocol}://${req.get("host")}`;
  const avatarUrl = `${origin}/uploads/${req.file.filename}`;
  const url       = await userService.setAvatarUrl(req.params.id, avatarUrl);
  res.json({ avatarUrl: url });
});

// POST /users/:id/linked-accounts
exports.addLinkedAccount = asyncHandler(async (req, res) => {
  assertOwnership(req);
  const accounts = await userService.addLinkedAccount(req.params.id, req.body);
  res.json(accounts);
});

// DELETE /users/:id/linked-accounts/:provider
exports.removeLinkedAccount = asyncHandler(async (req, res) => {
  assertOwnership(req);
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

// GET /users/me/notification-preferences
exports.getMyNotifPrefs = asyncHandler(async (req, res) => {
  const prefs = await userService.getNotifPrefs(req.user._id);
  res.json(prefs);
});

// PUT /users/me/notification-preferences
exports.setMyNotifPrefs = asyncHandler(async (req, res) => {
  const prefs = await userService.setNotifPrefs(req.user._id, req.body);
  res.json(prefs);
});
