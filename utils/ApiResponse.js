/**
 * Formate toutes les réponses succès de l'API de façon cohérente.
 * Utilisation : res.json(new ApiResponse(200, data, "Succès"))
 */
class ApiResponse {
  constructor(statusCode, data, message = "Succès") {
    this.statusCode = statusCode;
    this.data       = data;
    this.message    = message;
    this.success    = statusCode < 400;
  }
}

module.exports = ApiResponse;
