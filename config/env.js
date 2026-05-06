/**
 * Valide les variables d'environnement requises au démarrage.
 * Lance une erreur explicite si une variable est manquante.
 */
const required = ["MONGO_URI", "JWT_SECRET"];

const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(", ")}\n` +
      "Vérifiez votre fichier .env"
    );
  }
};

module.exports = { validateEnv };
