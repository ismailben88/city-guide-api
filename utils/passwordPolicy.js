const ApiError = require("./ApiError");

// Server-side password policy — MUST mirror the client checklist
// (LoginModal PW_RULES + AccountSecurity schema): at least 8 chars, with one
// uppercase letter, one digit, and one special character. The client enforces
// these too, but the API is the real boundary — without this, any direct API
// call (or a future client) could create/keep a trivially weak password.
//
// Note: the client also caps length at 20 for UX; we deliberately do NOT cap
// here — a longer password is never a security problem and rejecting one from
// another caller would be wrong.
function assertStrongPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new ApiError(400, "Le mot de passe doit faire au moins 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    throw new ApiError(400, "Le mot de passe doit contenir au moins une majuscule");
  }
  if (!/[0-9]/.test(password)) {
    throw new ApiError(400, "Le mot de passe doit contenir au moins un chiffre");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new ApiError(400, "Le mot de passe doit contenir au moins un caractère spécial");
  }
}

module.exports = { assertStrongPassword };
