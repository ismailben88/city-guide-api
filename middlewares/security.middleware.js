const rateLimit = require("express-rate-limit");

// ── Security headers ─────────────────────────────────────────────────────────
// Conservative, dependency-free headers for every API response (no helmet).
// Tuned for an API that ALSO serves user-uploaded media from /uploads:
//   • nosniff is the key one — stops a file uploaded with a misleading
//     extension from being MIME-sniffed and executed as HTML/JS.
//   • Cross-Origin-Resource-Policy is deliberately `cross-origin` so the
//     separate frontend origin can still load upload images.
//   • X-XSS-Protection is explicitly disabled (the legacy auditor can introduce
//     bugs); output escaping + the href sanitiser are the real defenses.
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  // Force HTTPS for future visits — only in production (would wrongly pin
  // http://localhost during dev). Browsers ignore it over plain HTTP anyway.
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}

// ── Auth rate limiting ───────────────────────────────────────────────────────
// Brute-force / credential-stuffing protection on the authentication routes.
// Skipped outside production so the local integration suite (which registers
// many users from one IP) and dev work aren't throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 attempts / IP / window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { success: false, message: "Trop de tentatives. Réessayez dans quelques minutes." },
});

module.exports = { securityHeaders, authLimiter };
