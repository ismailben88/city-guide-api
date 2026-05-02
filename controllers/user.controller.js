const User = require("../model/User");

// GET /users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) { next(err); }
};

// GET /users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json(user);
  } catch (err) { next(err); }
};

// PUT /users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const forbidden = ["passwordHash", "role", "isVerified"];
    forbidden.forEach((f) => delete req.body[f]);

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json(user);
  } catch (err) { next(err); }
};

// DELETE /users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Utilisateur désactivé" });
  } catch (err) { next(err); }
};

// POST /users/:id/avatar  (multipart/form-data — champ "avatar")
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

    const origin    = `${req.protocol}://${req.get("host")}`;
    const avatarUrl = `${origin}/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatarUrl },
      { new: true }
    );
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) { next(err); }
};

// POST /users/:id/linked-accounts
exports.addLinkedAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $push: { linkedAccounts: req.body } },
      { new: true }
    );
    res.json(user.linkedAccounts);
  } catch (err) { next(err); }
};

// DELETE /users/:id/linked-accounts/:provider
exports.removeLinkedAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { linkedAccounts: { platform: req.params.provider } } },
      { new: true }
    );
    res.json(user.linkedAccounts);
  } catch (err) { next(err); }
};
