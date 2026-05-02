require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const connectDB    = require("./config/db");
const errorHandler = require("./middleware/error");

const path = require("path");
const app  = express();

// ─── Connexion MongoDB ────────────────────────────────────────────────────────
connectDB();

// ─── Middlewares globaux ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes API v1 ───────────────────────────────────────────────────────────
const BASE = "/api/v1";

app.use(`${BASE}/auth`,          require("./routes/auth.routes"));
app.use(`${BASE}/users`,         require("./routes/user.routes"));
app.use(`${BASE}/cities`,        require("./routes/city.routes"));
app.use(`${BASE}/categories`,    require("./routes/category.routes"));
app.use(`${BASE}/places`,        require("./routes/place.routes"));
app.use(`${BASE}/events`,        require("./routes/event.routes"));
app.use(`${BASE}/scores`,        require("./routes/score.routes"));
app.use(`${BASE}/comments`,      require("./routes/comment.routes"));
app.use(`${BASE}/favorites`,     require("./routes/favorite.routes"));
app.use(`${BASE}/media`,         require("./routes/media.routes"));
app.use(`${BASE}/reports`,       require("./routes/report.routes"));
app.use(`${BASE}/notifications`, require("./routes/notification.routes"));

// Alias compatibles avec les noms de collections db.json
const guideRouter = require("./routes/guide.routes");
app.use(`${BASE}/guides`,         guideRouter);
app.use(`${BASE}/guideProfiles`,  guideRouter);   // frontend appelle /guideProfiles

const adminRouter = require("./routes/admin.routes");
app.use(`${BASE}/admin`,          adminRouter);
app.use(`${BASE}/pendingRequests`, require("./routes/pendingRequest.routes")); // frontend appelle /pendingRequests
app.use(`${BASE}/adminLogs`,       require("./routes/adminLog.routes"));       // frontend appelle /adminLogs
app.use(`${BASE}/businesses`,      require("./routes/business.routes"));       // frontend appelle /businesses

// ─── Health check ─────────────────────────────────────────────────────────────
app.get(`${BASE}/health`, (req, res) =>
  res.json({ status: "ok", db: "cityguide" })
);

// ─── Route introuvable ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route introuvable" }));

// ─── Gestionnaire d'erreurs global ───────────────────────────────────────────
app.use(errorHandler);

// ─── Démarrage serveur ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Serveur demarre sur le port ${PORT} ✓`)
);
