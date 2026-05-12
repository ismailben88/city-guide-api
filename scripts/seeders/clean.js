// Wipes all collections — run before seed.js for a fresh start
// Usage: node scripts/seeders/clean.js

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");

const User         = require("../../models/User");
const City         = require("../../models/City");
const Category     = require("../../models/Category");
const Place        = require("../../models/Place");
const Event        = require("../../models/Event");
const GuideProfile = require("../../models/GuideProfile");
const Comment      = require("../../models/Comment");
const Score        = require("../../models/Score");
const Favorite     = require("../../models/Favorite");
const Media        = require("../../models/Media");
const Report       = require("../../models/Report");
const Notification = require("../../models/Notification");
const PendingRequest = require("../../models/PendingRequest");
const AdminLog     = require("../../models/AdminLog");

const COLLECTIONS = [
  User, City, Category, Place, Event, GuideProfile,
  Comment, Score, Favorite, Media, Report, Notification,
  PendingRequest, AdminLog,
];

async function clean() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("MongoDB connected ✓");

  for (const Model of COLLECTIONS) {
    const { deletedCount } = await Model.deleteMany({});
    console.log(`  ${Model.modelName}: ${deletedCount} docs deleted`);
  }

  console.log("\n✅  Database cleaned successfully.");
  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error("❌ Clean failed:", err.message);
  process.exit(1);
});
