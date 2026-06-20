const User          = require("../models/User");
const ApiError      = require("../utils/ApiError");
const { assertStrongPassword } = require("../utils/passwordPolicy");
const { signToken } = require("../utils/jwt.utils");
const { USER_ROLES } = require("../config/constants");
const { getPagination } = require("../utils/pagination.utils");
const { deleteUploadedFile } = require("./fileCleanup.service");

const PROTECTED_FIELDS = ["passwordHash", "role", "isVerified", "isActive"];

const getUsers = async (query) => {
  const { role, isActive, ...rest } = query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (role)                    filter.role     = role;
  if (isActive !== undefined)  filter.isActive = isActive === "true";

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit };
};

const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  return user;
};

const updateUser = async (id, body) => {
  PROTECTED_FIELDS.forEach((f) => delete body[f]);
  const user = await User.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  return user;
};

const updateRole = async (id, role) => {
  const validRoles = Object.values(USER_ROLES);
  if (!role || !validRoles.includes(role))
    throw new ApiError(400, `Role invalide. Valeurs acceptées : ${validRoles.join(", ")}`);
  const user = await User.findByIdAndUpdate(id, { role }, { new: true });
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  return user;
};

const deactivateUser = async (id) => {
  await User.findByIdAndUpdate(id, { isActive: false });
};

const changePassword = async (userId, currentPassword, newPassword) => {
  assertStrongPassword(newPassword);

  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new ApiError(404, "Utilisateur introuvable");

  const valid = await user.verifyPassword(currentPassword);
  if (!valid) throw new ApiError(401, "Mot de passe actuel incorrect");

  user.passwordHash = newPassword;
  // Invalidate every previously-issued token (e.g. a session opened with the
  // old/leaked password) by bumping tokenVersion, then mint a fresh token so
  // the device that just changed the password stays signed in.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  return signToken(user);
};

const deactivateMyAccount = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
};

const setAvatarUrl = async (id, avatarUrl) => {
  const user = await User.findById(id).select("avatarUrl");
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  await deleteUploadedFile(user.avatarUrl);
  user.avatarUrl = avatarUrl;
  await user.save();
  return user.avatarUrl;
};

const addLinkedAccount = async (id, accountData) => {
  const user = await User.findByIdAndUpdate(
    id,
    { $push: { linkedAccounts: accountData } },
    { new: true }
  );
  return user.linkedAccounts;
};

const removeLinkedAccount = async (id, platform) => {
  const user = await User.findByIdAndUpdate(
    id,
    { $pull: { linkedAccounts: { platform } } },
    { new: true }
  );
  return user.linkedAccounts;
};

const getNotifPrefs = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  return user.notificationPreferences || {};
};

const setNotifPrefs = async (userId, prefs) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { notificationPreferences: prefs },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  return user.notificationPreferences;
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateRole,
  deactivateUser,
  changePassword,
  deactivateMyAccount,
  setAvatarUrl,
  addLinkedAccount,
  removeLinkedAccount,
  getNotifPrefs,
  setNotifPrefs,
};
