require("dotenv").config();

const { validateEnv } = require("./config/env");
validateEnv();

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const connectDB    = require("./config/db");
const apiRouter    = require("./routes/index");
const errorHandler = require("./middlewares/error.middleware");

connectDB();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS: origin not allowed"));
  },
  credentials: true,
}));

// ─── Middlewares globaux ──────────────────────────────────────────────────────
app.use(express.json());

// Serve uploads — /tmp/uploads on Vercel, ./uploads locally
const uploadsDir = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

// ─── Routes API v1 ───────────────────────────────────────────────────────────
app.use("/api/v1", apiRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) =>
  res.json({ status: "ok", db: "cityguide", env: process.env.NODE_ENV || "development" })
);

// ─── Route introuvable ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Route introuvable" }));

// ─── Gestionnaire d'erreurs global ───────────────────────────────────────────
app.use(errorHandler);

// ─── Démarrage serveur (local uniquement — Vercel gère lui-même le serveur) ───
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT} ✓`));
}

module.exports = app;
