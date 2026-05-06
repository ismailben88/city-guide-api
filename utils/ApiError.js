/**
 * Erreur HTTP standardisée pour toute l'API.
 * Utilisation : throw new ApiError(404, "Ressource introuvable")
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors     = errors;
    this.isOperational = true; // distingue les erreurs métier des bugs
  }
}

module.exports = ApiError;
