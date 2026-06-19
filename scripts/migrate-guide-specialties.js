// ─────────────────────────────────────────────────────────────────────────────
//  migrate-guide-specialties.js — one-shot migration.
//
//  Rewrites every GuideProfile.specialties array to the canonical taxonomy
//  (constants/guideSpecialties.js). Legacy free-text specialties (from the old
//  seed) are mapped to their best-fit canonical id via MAP below; values that
//  are already canonical pass through unchanged; anything unrecognised is
//  dropped. Idempotent — safe to run multiple times.
//
//  Usage:
//    node scripts/migrate-guide-specialties.js          # dry-run (prints diff)
//    node scripts/migrate-guide-specialties.js --apply   # writes to the DB
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const GuideProfile = require("../models/GuideProfile");
const { GUIDE_SPECIALTIES } = require("../constants/guideSpecialties");

const DB_NAME = process.env.DB_NAME || "city_guide_v2";
const APPLY   = process.argv.includes("--apply");
const CANON   = new Set(GUIDE_SPECIALTIES);

// Legacy free-text → canonical id. Keys are the exact phrases shipped by the
// previous seed; add more here if other free-text values exist in production.
const MAP = {
  "Fes el-Bali Medina":                  "history",
  "Islamic Architecture":                "history",
  "Chouara Tanneries":                   "art",
  "Fassi Gastronomy":                    "food",
  "Moroccan Culinary History":           "cooking",
  "Marrakech Medina":                    "history",
  "Moroccan Cuisine & Cooking Classes":  "cooking",
  "Berber Culture & Crafts":             "berber",
  "Authentic Souk Shopping":             "souks",
  "Women's Cooperative Visits":          "art",
  "Erg Chebbi & Merzouga":               "desert",
  "4x4 Deep Sahara Expeditions":         "desert",
  "Draa Valley & Kasbahs":               "hidden",
  "Nomadic Berber Culture":              "berber",
  "Aït Benhaddou UNESCO Site":           "history",
  "Rabat UNESCO World Heritage Sites":   "history",
  "Moroccan Modern & Contemporary Art":  "art",
  "Chellah Roman Ruins":                 "history",
  "Kasbah of the Udayas":                "history",
  "Rabat Food & Restaurant Scene":       "food",
  "Taghazout Surf Instruction":          "beaches",
  "Point Break Surfing Tours":           "beaches",
  "Atlantic Coastal Hiking":             "hiking",
  "Fishing Village Visits":              "hidden",
  "Souss Valley & Argan Culture":        "berber",
  "Chefchaouen Blue Medina":             "photo",
  "Rif Mountain Trekking":               "hiking",
  "Akchour Waterfalls Hike":             "hiking",
  "Rif Berber Cuisine & Food Walks":     "food",
  "Sustainable Tourism":                 "hidden",
  "Casablanca Art Deco Architecture":    "history",
  "Hassan II Mosque":                    "spiritual",
  "Street Food & Habous Quarter":        "food",
  "Contemporary Moroccan Art Scene":     "art",
  "Morocco Startup & Business Network":  null,   // no tourism-relevant canonical fit → drop
  "Essaouira Medina History":            "history",
  "Gnaoua Music & Culture":              "music",
  "Jewish Heritage of Essaouira":        "spiritual",
  "Hammam & Wellness Experiences":       "hammam",
  "Kitesurfing Introduction":            "beaches",
};

// Map a single raw value → canonical id (or null to drop).
function toCanonical(raw) {
  const v = String(raw || "").trim();
  if (CANON.has(v)) return v;                 // already canonical
  if (v in MAP) return MAP[v];                // known legacy phrase
  const lower = v.toLowerCase();
  if (CANON.has(lower)) return lower;         // case-only drift
  return null;                                // unrecognised → drop
}

function canonicalise(specialties = []) {
  const out = [];
  for (const s of specialties) {
    const id = toCanonical(s);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME });
  console.log(`✓ MongoDB connected (${DB_NAME}) — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const guides = await GuideProfile.find({}).select("specialties").lean();
  let changed = 0;

  for (const g of guides) {
    const before = g.specialties || [];
    const after  = canonicalise(before);
    const same = before.length === after.length && before.every((v, i) => v === after[i]);
    if (same) continue;
    changed++;
    console.log(`• ${g._id}`);
    console.log(`    before: [${before.join(", ")}]`);
    console.log(`    after:  [${after.join(", ")}]`);
    if (APPLY) {
      await GuideProfile.updateOne({ _id: g._id }, { $set: { specialties: after } });
    }
  }

  console.log(`\n${changed} guide(s) ${APPLY ? "updated" : "would change"} — ${guides.length} total.`);
  if (!APPLY && changed > 0) console.log("Re-run with --apply to write the changes.");
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
