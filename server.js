require("dotenv").config();

const { validateEnv } = require("./config/env");
validateEnv(); // Plante au démarrage si une variable requise est absente

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const connectDB    = require("./config/db");
const apiRouter    = require("./routes/index");
const errorHandler = require("./middlewares/error.middleware");

connectDB();

const app = express();

// ─── Middlewares globaux ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes API v1 ───────────────────────────────────────────────────────────
app.use("/api/v1", apiRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) =>
  res.json({ status: "ok", db: "cityguide" })
);

// ─── Route introuvable ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Route introuvable" }));

// ─── Gestionnaire d'erreurs global ───────────────────────────────────────────
app.use(errorHandler);

// ─── Démarrage serveur ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Serveur démarré sur le port ${PORT} ✓`)
);
