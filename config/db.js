const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "cityguide",
    });
    console.log(`MongoDB connecte : ${conn.connection.host} ✓`);
  } catch (err) {
    console.error("Erreur connexion :", err.message);
    process.exit(1);
  }
};
module.exports = connectDB;
