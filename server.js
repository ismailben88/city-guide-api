require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connexion MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", db: "cityguide" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur demarre sur le port ${PORT} ✓`);
});
