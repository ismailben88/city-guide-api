/**
 * Orphan upload cleaner
 *
 * Usage:
 *   node scripts/cleanOrphanUploads.js           # dry-run (list only)
 *   node scripts/cleanOrphanUploads.js --delete   # actually delete orphans
 *
 * An orphan is a file inside /uploads that is no longer referenced
 * by any document in MongoDB (User, GuideProfile, Place, Media).
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs         = require("fs");
const path       = require("path");
const mongoose   = require("mongoose");
const connectDB  = require("../config/db");

const User         = require("../models/User");
const GuideProfile = require("../models/GuideProfile");
const Place        = require("../models/Place");
const Media        = require("../models/Media");
const { getUploadsDir, extractFilename } = require("../services/fileCleanup.service");

const DRY_RUN = !process.argv.includes("--delete");

const collectFilenames = (urls) =>
  urls
    .filter(Boolean)
    .map(extractFilename)
    .filter(Boolean);

async function getReferencedFilenames() {
  const [users, guides, places, media] = await Promise.all([
    User.find({}).select("avatarUrl").lean(),
    GuideProfile.find({}).select("bannerUrl").lean(),
    Place.find({}).select("images").lean(),
    Media.find({}).select("url").lean(),
  ]);

  const referenced = new Set([
    ...collectFilenames(users.map((u) => u.avatarUrl)),
    ...collectFilenames(guides.map((g) => g.bannerUrl)),
    ...collectFilenames(places.flatMap((p) => p.images ?? [])),
    ...collectFilenames(media.map((m) => m.url)),
  ]);

  return referenced;
}

async function run() {
  await connectDB();

  const uploadsDir = getUploadsDir();

  let diskFiles;
  try {
    diskFiles = await fs.promises.readdir(uploadsDir);
  } catch {
    console.log(`Uploads directory not found: ${uploadsDir}`);
    await mongoose.disconnect();
    return;
  }

  const referenced = await getReferencedFilenames();

  const orphans = diskFiles.filter(
    (f) => !f.startsWith(".") && !referenced.has(f)
  );

  if (!orphans.length) {
    console.log("No orphan files found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\nFound ${orphans.length} orphan file(s):`);
  orphans.forEach((f) => console.log("  ", f));

  if (DRY_RUN) {
    console.log("\nDry-run mode — pass --delete to remove these files.");
  } else {
    let deleted = 0;
    for (const f of orphans) {
      try {
        await fs.promises.unlink(path.join(uploadsDir, f));
        deleted++;
      } catch (err) {
        console.warn(`  Could not delete ${f}:`, err.message);
      }
    }
    console.log(`\nDeleted ${deleted} orphan file(s).`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
