const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || undefined,
    });
    console.log(`MongoDB connecté : ${conn.connection.host} / db: ${conn.connection.name} ✓`);
  } catch (err) {
    console.error("Erreur connexion :", err.message);
    process.exit(1);
  }
};
module.exports = connectDB;
