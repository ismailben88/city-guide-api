const ApiError = require("../utils/ApiError");

// Gestionnaire d'erreurs global — dernier middleware de la chaîne Express
const errorHandler = (err, req, res, next) => {
  // Erreurs opérationnelles connues (ApiError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors.length ? { errors: err.errors } : {}),
    });
  }

  // Erreur de validation Mongoose
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // Champ unique dupliqué (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} déjà utilisé` });
  }

  // ID Mongoose invalide
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "ID invalide" });
  }

  // Erreur inconnue — ne pas exposer les détails en production
  console.error("[ERROR]", err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Erreur serveur" : err.message,
  });
};

module.exports = errorHandler;
