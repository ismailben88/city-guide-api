const User     = require("../models/User");
const ApiError = require("../utils/ApiError");
const { getPagination } = require("../utils/pagination.utils");

// Champs interdits lors d'une mise à jour par l'utilisateur lui-même
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

const deactivateUser = async (id) => {
  await User.findByIdAndUpdate(id, { isActive: false });
};

const setAvatarUrl = async (id, avatarUrl) => {
  const user = await User.findByIdAndUpdate(id, { avatarUrl }, { new: true });
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
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

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deactivateUser,
  setAvatarUrl,
  addLinkedAccount,
  removeLinkedAccount,
};
