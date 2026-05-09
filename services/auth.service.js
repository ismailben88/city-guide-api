const User     = require("../models/User");
const ApiError = require("../utils/ApiError");
const { signToken } = require("../utils/jwt.utils");

// Champs renvoyés au client après auth — jamais le passwordHash
const toPublicUser = (user) => ({
  id:             user._id,
  firstName:      user.firstName,
  lastName:       user.lastName,
  email:          user.email,
  role:           user.role,
  avatarUrl:      user.avatarUrl,
  isVerified:     user.isVerified,
  authProvider:   user.authProvider,
  linkedAccounts: user.linkedAccounts || [],
});

const registerUser = async ({ firstName, lastName, email, password, authProvider, avatarUrl }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(400, "Email déjà utilisé");

  const user  = await User.create({ firstName, lastName, email, passwordHash: password, authProvider, avatarUrl });
  const token = signToken(user._id);
  return { token, user: toPublicUser(user) };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.verifyPassword(password)))
    throw new ApiError(401, "Email ou mot de passe incorrect");

  if (!user.isActive) throw new ApiError(403, "Compte désactivé");

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  return { token, user: toPublicUser(user) };
};

const googleAuth = async ({ googleId, email, name, avatar }) => {
  const parts     = (name || "").trim().split(/\s+/);
  const firstName = parts[0] || "User";
  const lastName  = parts.slice(1).join(" ") || "";

  let user = await User.findOne({ email });

  if (user) {
    // User exists — sign in directly, no password check needed (Google is authoritative)
    if (!user.isActive) throw new ApiError(403, "Compte désactivé");
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
  } else {
    // New user — create account
    user = await User.create({
      firstName,
      lastName,
      email,
      authProvider: "google",
      avatarUrl:    avatar || "",
      passwordHash: `ggl_${googleId}`, // unusable password, can't be used to login directly
    });
  }

  const token = signToken(user._id);
  return { token, user: toPublicUser(user) };
};

module.exports = { registerUser, loginUser, googleAuth, toPublicUser };
