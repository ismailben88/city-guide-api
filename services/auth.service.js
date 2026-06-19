const User         = require("../models/User");
const Notification = require("../models/Notification");
const ApiError     = require("../utils/ApiError");
const { signToken } = require("../utils/jwt.utils");
const { assertStrongPassword } = require("../utils/passwordPolicy");
const notify       = require("../helpers/notify");

// Send welcome + profile-reminder notifications the first time a user has none.
// Called on login so existing users (registered before this code) also receive them.
async function sendOnboardingIfNew(userId, firstName) {
  const count = await Notification.countDocuments({ userId });
  if (count === 0) {
    await notify.welcomeUser(userId, firstName);
    await notify.profileIncompleteReminder(userId);
  }
}

// Champs renvoyés au client après auth — jamais le passwordHash
const toPublicUser = (user) => ({
  id:               user._id,
  firstName:        user.firstName,
  lastName:         user.lastName,
  email:            user.email,
  role:             user.role,
  avatarUrl:        user.avatarUrl,
  isVerified:       user.isVerified,
  authProvider:     user.authProvider,
  linkedAccounts:   user.linkedAccounts   || [],
});

const registerUser = async ({ firstName, lastName, email, password, authProvider, avatarUrl }) => {
  assertStrongPassword(password);

  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(400, "Email déjà utilisé");

  const user  = await User.create({ firstName, lastName, email, passwordHash: password, authProvider, avatarUrl });
  const token = signToken(user);

  // Fire-and-forget: welcome + profile completion reminder
  notify.welcomeUser(user._id, user.firstName).catch(() => {});
  notify.profileIncompleteReminder(user._id).catch(() => {});

  return { token, user: toPublicUser(user) };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.verifyPassword(password)))
    throw new ApiError(401, "Email ou mot de passe incorrect");

  if (!user.isActive) throw new ApiError(403, "auth_error.account_disabled");

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  // Fire-and-forget: send onboarding notifications if user has never received any
  sendOnboardingIfNew(user._id, user.firstName).catch(() => {});

  const token = signToken(user);
  return { token, user: toPublicUser(user) };
};

const socialAuth = async ({ provider, accountId, email, name, avatar }) => {
  const parts     = (name || "").trim().split(/\s+/);
  const firstName = parts[0] || "User";
  const lastName  = parts.slice(1).join(" ") || "";

  let user = await User.findOne({ email });

  if (user) {
    if (!user.isActive) throw new ApiError(403, "auth_error.account_disabled");
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    // Fire-and-forget: onboarding notifications for existing social users
    sendOnboardingIfNew(user._id, user.firstName).catch(() => {});
  } else {
    user = await User.create({
      firstName,
      lastName,
      email,
      authProvider: provider,
      avatarUrl:    avatar || "",
      passwordHash: `${provider}_${accountId}`,
    });

    // Fire-and-forget: welcome new social auth users
    notify.welcomeUser(user._id, user.firstName).catch(() => {});
    notify.profileIncompleteReminder(user._id).catch(() => {});
  }

  const token = signToken(user);
  return { token, user: toPublicUser(user) };
};

const googleAuth   = ({ googleId,   email, name, avatar }) =>
  socialAuth({ provider: "google",   accountId: googleId,   email, name, avatar });

const facebookAuth = ({ facebookId, email, name, avatar }) =>
  socialAuth({ provider: "facebook", accountId: facebookId, email, name, avatar });

module.exports = { registerUser, loginUser, googleAuth, facebookAuth, toPublicUser };
