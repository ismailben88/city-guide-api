const jwt = require("jsonwebtoken");
const User = require("../model/User");

// Vérifie le token JWT et attache req.user
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Non authentifié" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: "Utilisateur introuvable" });

    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// Restreint l'accès aux rôles spécifiés
const restrict = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: "Accès refusé" });
  next();
};

module.exports = { protect, restrict };
