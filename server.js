require("dotenv").config();

const { validateEnv } = require("./config/env");
validateEnv();

const http         = require("http");
const { Server }   = require("socket.io");
const express        = require("express");
const cors           = require("cors");
const path           = require("path");
const mongoSanitize  = require("express-mongo-sanitize");
const connectDB      = require("./config/db");
const apiRouter      = require("./routes/index");
const errorHandler   = require("./middlewares/error.middleware");
const { setIO }      = require("./utils/socket");
const { injectSpeedInsights } = require("./utils/speedInsights");

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
// Inject Vercel Speed Insights into HTML responses (only in production on Vercel)
app.use(injectSpeedInsights);
// Strip MongoDB operators ($, .) from request inputs — prevents NoSQL injection.
// Express 5 makes req.query a read-only getter, so we override it with a sanitized
// data property rather than trying to reassign the getter directly.
app.use((req, res, next) => {
  if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  const rawQuery = req.query;
  if (rawQuery && Object.keys(rawQuery).length) {
    Object.defineProperty(req, "query", {
      configurable: true, writable: true, enumerable: true,
      value: mongoSanitize.sanitize(rawQuery),
    });
  }
  next();
});

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

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Upgrade to websocket, fall back to polling
  transports: ["websocket", "polling"],
});

// Register io singleton so services can emit without importing server.js
setIO(io);

io.on("connection", (socket) => {
  // Client sends its userId right after connecting (from useNotificationSocket hook)
  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on("disconnect", () => {});
});

// ─── Démarrage serveur (local uniquement — Vercel gère lui-même le serveur) ───
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () =>
    console.log(`Server on port ${PORT} ✓  (Socket.IO ready)`)
  );
}

module.exports = app;
