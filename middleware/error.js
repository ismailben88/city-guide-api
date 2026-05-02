// Gestionnaire d'erreurs global — dernier middleware de la chaîne
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Erreur de validation Mongoose
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  // Champ unique dupliqué (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} déjà utilisé` });
  }

  // CastError (id invalide)
  if (err.name === "CastError")
    return res.status(400).json({ message: "ID invalide" });

  res.status(err.status || 500).json({ message: err.message || "Erreur serveur" });
};

module.exports = errorHandler;
