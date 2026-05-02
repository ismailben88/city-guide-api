const jwt = require("jsonwebtoken");
const User = require("../model/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const safeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  isVerified: user.isVerified,
});

// POST /auth/register
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email déjà utilisé" });

    const user = await User.create({ firstName, lastName, email, passwordHash: password });
    const token = signToken(user._id);

    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await user.verifyPassword(password)))
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    if (!user.isActive)
      return res.status(403).json({ message: "Compte désactivé" });

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.json({ token, user: safeUser(user) });
  } catch (err) { next(err); }
};

// POST /auth/logout
exports.logout = (req, res) => res.json({ message: "Déconnecté" });

// POST /auth/refresh
exports.refreshToken = (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const token = signToken(decoded.id);
    res.json({ token });
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};

// GET /auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (err) { next(err); }
};
