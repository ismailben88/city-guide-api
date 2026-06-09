// ─────────────────────────────────────────────────────────────────────────────
//  Seed REAL Scores + Comments aligned with seeded averageRating/reviewCount
//  on GuideProfile and Place documents.
//
//  Why? The v2 seed wrote averageRating/reviewCount as numbers but never created
//  the underlying Score/Comment docs. So when a real user posts a review,
//  recalcRating finds only 1 score and overwrites the seeded 4.8 with 4.0.
//
//  This script:
//   1. Creates ~120 fake tourist users (idempotent — only if missing)
//   2. For each Guide and Place with seeded averageRating > 0:
//        - Generates N reviews (Score + Comment) where N ≈ seededReviewCount
//          capped to (availableUsers - 1) to respect the Score unique index
//          and self-review guard.
//        - Ratings sampled to converge on seededAverageRating ± 0.15
//        - Random short review text from a pool (EN/FR/AR mix for realism)
//   3. Updates each entity's averageRating/reviewCount to the actual values
//      so frontend ↔ DB are now consistent and survive recalcRating.
//
//  Idempotent: re-running clears existing tourist scores+comments before
//  re-generating, so values stay stable.
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const User         = require("../models/User");
const GuideProfile = require("../models/GuideProfile");
const Place        = require("../models/Place");
const Score        = require("../models/Score");
const Comment      = require("../models/Comment");

const TOURIST_TAG = "seed-tourist@cityguide.ma"; // marker domain for fake users

// 120 realistic first/last name pools — mixed Moroccan + international
const FIRSTS_AR = ["Aya","Sara","Yasmine","Imane","Salma","Nour","Hiba","Lina","Maryam","Rim","Khadija","Hanane","Soukaina","Fatiha","Zineb","Asmaa","Houda","Mounia","Nadia","Samira","Karim","Youssef","Mehdi","Hamza","Omar","Ayoub","Reda","Anas","Adil","Soufiane","Othmane","Bilal","Ilyas","Achraf","Mounir","Tarik","Hicham","Saad","Rachid","Jamal"];
const FIRSTS_EN = ["Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella","James","Mia","Lucas","Charlotte","Henry","Amelia","Alexander","Harper","Daniel","Evelyn","Michael","Abigail","Sebastian","Emily","David","Madison","Joseph","Ella","Samuel","Avery","Carter","Sofia","Wyatt","Camila"];
const FIRSTS_FR = ["Léa","Hugo","Chloé","Louis","Manon","Gabriel","Camille","Raphaël","Inès","Adam","Jade","Arthur","Louise","Jules","Anna","Théo","Sarah","Nathan","Léna","Tom","Zoé","Paul","Alice","Mathis","Eva","Ethan","Romane","Maël","Juliette"];
const LASTS    = ["El Idrissi","Benali","Cherkaoui","Tazi","Bennani","Alaoui","Fassi","El Amrani","Ouazzani","Sebti","El Mansouri","Bouhlal","Lahlou","Berrada","Smith","Johnson","Brown","Garcia","Martinez","Rodriguez","Wilson","Anderson","Thomas","Moore","Martin","Dubois","Bernard","Petit","Robert","Richard","Durand","Müller","Schmidt","Rossi","Romano","Ferrari","García","Hernández","Lefebvre","Mercier"];

// Short multilingual review snippets keyed by approximate rating band (1–5)
const REVIEWS = {
  5: [
    "Absolutely amazing experience! Highly recommend.",
    "Best tour we ever had. Knowledgeable, warm, and patient.",
    "Tour exceptionnel, je recommande à 100%.",
    "Une expérience inoubliable et un guide passionné.",
    "تجربة لا تُنسى، أنصح بها بشدة.",
    "دليل محترف وودود جداً.",
    "Truly authentic Morocco. Worth every penny.",
    "Friendly, professional, and full of insider stories.",
    "Une rencontre humaine magnifique en plus de la visite.",
    "Exceeded all expectations. Thank you!",
    "خدمة ممتازة ومعرفة عميقة بالمكان.",
    "On a appris énormément, c'était passionnant.",
  ],
  4: [
    "Great tour, would book again.",
    "Lovely day out, learned a lot about the medina.",
    "Très bonne expérience, guide compétent.",
    "Une belle visite, à refaire.",
    "تجربة جيدة جداً، شكراً لك.",
    "نزهة ممتعة وثقافة غنية.",
    "Highly knowledgeable and very engaging.",
    "Well organized and informative.",
    "Visite intéressante avec de bons conseils.",
    "Aurait pu être un peu plus long, mais excellent.",
    "Solid guide, nice pace.",
    "Beaucoup d'anecdotes, on a beaucoup ri.",
  ],
  3: [
    "Good overall but a bit rushed at the end.",
    "Pas mal mais quelques moments un peu longs.",
    "تجربة متوسطة، يمكن تحسينها.",
    "Decent — got what we paid for, nothing more.",
    "Correct, mais sans surprise.",
    "Average. The guide knew his stuff but the energy was low.",
  ],
  2: [
    "Disappointing pace, felt like a checklist.",
    "Pas vraiment à la hauteur des avis.",
    "أقل من المتوقع.",
  ],
  1: [
    "Not the experience we hoped for.",
    "Très en dessous de mes attentes.",
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Sample a rating that converges on the target average ± noise
function sampleRating(targetAvg) {
  const noise = (Math.random() - 0.5) * 0.9; // ±0.45
  const v = Math.round(targetAvg + noise);
  return Math.max(1, Math.min(5, v));
}

function makeReviewText(rating) {
  const band = REVIEWS[rating] || REVIEWS[3];
  return pick(band);
}

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function ensureTouristUsers(target = 120) {
  const existing = await User.find({ email: { $regex: TOURIST_TAG.replace(/[.@]/g, "\\$&") + "$" } }).select("_id firstName lastName").lean();
  console.log(`[users] ${existing.length} tourist users already exist`);
  if (existing.length >= target) return existing;

  const need = target - existing.length;
  console.log(`[users] creating ${need} new tourist users…`);
  const pwHash = await bcrypt.hash("Touriste2026!", 10);
  const allFirsts = [...FIRSTS_AR, ...FIRSTS_EN, ...FIRSTS_FR];
  const docs = [];
  for (let i = existing.length; i < target; i++) {
    const firstName = pick(allFirsts);
    const lastName  = pick(LASTS);
    docs.push({
      firstName,
      lastName,
      email: `tourist${i + 1}.${TOURIST_TAG}`,
      passwordHash: pwHash,
      authProvider: "local",
      role: "user",
      isGuide: false,
      isActive: true,
      isVerified: false,
      isEmailVerified: true,
      avatarUrl: "",
      bio: "",
    });
  }
  const inserted = await User.insertMany(docs, { ordered: false });
  console.log(`[users] inserted ${inserted.length} tourist users`);
  return [...existing, ...inserted];
}

async function seedReviewsForEntity({ entityId, entityType, ownerUserId, targetAvg, targetCount, tourists }) {
  // Filter out the owner if present (self-review guard)
  const pool = tourists.filter((u) => !ownerUserId || String(u._id) !== String(ownerUserId));
  if (!pool.length) return { scores: 0, comments: 0 };

  const targetN = Math.min(targetCount, pool.length);
  const authors = shuffle(pool).slice(0, targetN);

  // Clear any prior fake reviews so we don't accumulate duplicates on re-run
  await Score.deleteMany({
    targetId: entityId, targetType: entityType,
    authorId: { $in: authors.map((u) => u._id) },
  });
  await Comment.deleteMany({
    targetId: entityId, targetType: entityType,
    authorId: { $in: authors.map((u) => u._id) },
  });

  const scoreDocs = [];
  const commentDocs = [];
  let sum = 0;

  for (const u of authors) {
    const rating = sampleRating(targetAvg);
    sum += rating;
    scoreDocs.push({
      targetId: entityId, targetType: entityType,
      authorId: u._id, score: rating,
    });
    commentDocs.push({
      targetId: entityId, targetType: entityType,
      authorId: u._id,
      content: makeReviewText(rating),
      rating,
      status: "active",
      parentCommentId: null,
    });
  }

  if (scoreDocs.length)   await Score.insertMany(scoreDocs,   { ordered: false });
  if (commentDocs.length) await Comment.insertMany(commentDocs, { ordered: false });

  const actualAvg = +(sum / authors.length).toFixed(2);
  return { scores: scoreDocs.length, comments: commentDocs.length, actualAvg, actualCount: authors.length };
}

async function main() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || undefined });
  console.log("Connected. DB:", mongoose.connection.name);

  const tourists = await ensureTouristUsers(120);
  console.log(`[users] total tourist pool: ${tourists.length}`);

  // ── GUIDES ──
  const guides = await GuideProfile.find({ averageRating: { $gt: 0 } }).select("_id userId averageRating reviewCount").lean();
  console.log(`\n[guides] processing ${guides.length} guides with seeded ratings…`);
  for (const g of guides) {
    const r = await seedReviewsForEntity({
      entityId: g._id, entityType: "GuideProfile",
      ownerUserId: g.userId, targetAvg: g.averageRating, targetCount: g.reviewCount,
      tourists,
    });
    await GuideProfile.findByIdAndUpdate(g._id, { averageRating: r.actualAvg, reviewCount: r.actualCount });
    console.log(`  guide ${g._id} — seeded ${r.scores} scores | avg ${r.actualAvg} (target ${g.averageRating}) | count ${r.actualCount} (target ${g.reviewCount})`);
  }

  // ── PLACES ──
  const places = await Place.find({ averageRating: { $gt: 0 } }).select("_id ownerId averageRating reviewCount").lean();
  console.log(`\n[places] processing ${places.length} places with seeded ratings…`);
  let pIdx = 0;
  for (const p of places) {
    pIdx++;
    const r = await seedReviewsForEntity({
      entityId: p._id, entityType: "Place",
      ownerUserId: p.ownerId, targetAvg: p.averageRating, targetCount: p.reviewCount,
      tourists,
    });
    await Place.findByIdAndUpdate(p._id, { averageRating: r.actualAvg, reviewCount: r.actualCount });
    if (pIdx % 25 === 0) console.log(`  …processed ${pIdx}/${places.length} places`);
  }
  console.log(`[places] done. processed ${places.length} places`);

  await mongoose.disconnect();
  console.log("\n✓ All done. Real Scores+Comments now back the seeded averages.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
