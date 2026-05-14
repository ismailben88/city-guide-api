// Main seeder orchestrator — seeds a production-quality Moroccan tourism dataset
//
// Usage:
//   node scripts/seeders/seed.js            (clean + seed)
//   node scripts/seeders/seed.js --no-clean (seed without wiping first)
//
// Order: users → cities → categories → places → events → guides

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// ── Models ──────────────────────────────────────────────────────────────────
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

// ── Seed data ────────────────────────────────────────────────────────────────
const USERS_DATA      = require("./data/users");
const CITIES_DATA     = require("./data/cities");
const CATEGORIES_DATA = require("./data/categories");
const PLACES_DATA     = require("./data/places");
const EVENTS_DATA     = require("./data/events");
const GUIDES_DATA     = require("./data/guides");

// ── ID lookups (populated as we seed) ───────────────────────────────────────
const userByKey     = {}; // key → User doc
const cityBySlug    = {}; // slug → City._id
const categoryBySlug = {}; // slug → Category._id

// ── Helpers ──────────────────────────────────────────────────────────────────
const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CLEAN_COLLECTIONS = [
  User, City, Category, Place, Event, GuideProfile,
  Comment, Score, Favorite, Media, Report, Notification,
  PendingRequest, AdminLog,
];

// ── Connect ───────────────────────────────────────────────────────────────────
async function connect() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("✓ MongoDB connected\n");
}

// ── Clean ─────────────────────────────────────────────────────────────────────
async function clean() {
  console.log("▶  Cleaning database…");
  for (const Model of CLEAN_COLLECTIONS) {
    const { deletedCount } = await Model.deleteMany({});
    if (deletedCount) console.log(`   ${Model.modelName}: ${deletedCount} deleted`);
  }
  console.log("✓  Database cleaned\n");
}

// ── 1. Users ──────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("▶  Seeding users…");
  for (const u of USERS_DATA) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const doc = await User.create({
      firstName:   u.firstName,
      lastName:    u.lastName,
      email:       u.email,
      passwordHash,
      role:        u.role  || "user",
      isGuide:     u.isGuide || false,
      isVerified:  u.isVerified !== undefined ? u.isVerified : true,
      isActive:    true,
      avatarUrl:   u.avatarUrl || "",
      bio:         u.bio || "",
      city:        u.city || "",
      phone:       u.phone || "",
      nationality: u.nationality || "",
      gender:      u.gender || "",
    });
    userByKey[u.key] = doc;
  }
  console.log(`✓  ${USERS_DATA.length} users seeded\n`);
}

// ── 2. Cities ─────────────────────────────────────────────────────────────────
async function seedCities() {
  console.log("▶  Seeding cities…");
  for (const c of CITIES_DATA) {
    const doc = await City.create({
      name:     c.name,
      slug:     c.slug,
      region:   c.region || "",
      location: c.location,
      isActive: c.isActive !== undefined ? c.isActive : true,
    });
    cityBySlug[c.slug] = doc._id;
    if (c.key) cityBySlug[c.key] = doc._id;
  }
  console.log(`✓  ${CITIES_DATA.length} cities seeded\n`);
}

// ── 3. Categories ─────────────────────────────────────────────────────────────
async function seedCategories() {
  console.log("▶  Seeding categories…");

  // Pass 1: parent categories (no parent field)
  for (const c of CATEGORIES_DATA.filter(c => !c.parent)) {
    const doc = await Category.create({
      name:   c.name,
      slug:   c.slug,
      icon:   c.icon || "",
      status: "active",
    });
    categoryBySlug[c.slug] = doc._id;
    if (c.key) categoryBySlug[c.key] = doc._id;
  }

  // Pass 2: child categories — resolve parent slug → parentId ObjectId
  for (const c of CATEGORIES_DATA.filter(c => c.parent)) {
    const parentId = categoryBySlug[c.parent] || null;
    if (!parentId) console.warn(`   WARN category "${c.slug}" — unknown parent: ${c.parent}`);
    const doc = await Category.create({
      name:     c.name,
      slug:     c.slug,
      icon:     c.icon || "",
      parentId,
      status:   "active",
    });
    categoryBySlug[c.slug] = doc._id;
    if (c.key) categoryBySlug[c.key] = doc._id;
  }

  console.log(`✓  ${CATEGORIES_DATA.length} categories seeded\n`);
}

// ── 4. Places ─────────────────────────────────────────────────────────────────
async function seedPlaces() {
  console.log("▶  Seeding places…");
  let count = 0;
  let skipped = 0;

  for (const p of PLACES_DATA) {
    const cityId     = cityBySlug[p.city];
    const categoryId = categoryBySlug[p.category];

    if (!cityId) {
      console.warn(`   SKIP place "${p.name}" — unknown city: ${p.city}`);
      skipped++;
      continue;
    }
    if (!categoryId) {
      console.warn(`   SKIP place "${p.name}" — unknown category: ${p.category}`);
      skipped++;
      continue;
    }

    await Place.create({
      name:               p.name,
      slug:               p.slug || slugify(p.name),
      categoryId,
      cityId,
      description:        p.description || "",
      address:            p.address     || "",
      images:             p.images      || [],
      location:           p.location    || { type: "Point", coordinates: [0, 0] },
      priceRange:         p.priceRange  || "",
      isFeatured:         p.isFeatured  || false,
      averageRating:      p.averageRating || 0,
      reviewCount:        p.reviewCount   || 0,
      status:             "active",
      isVerifiedBusiness: false,
    });
    count++;
  }

  console.log(`✓  ${count} places seeded${skipped ? ` (${skipped} skipped)` : ""}\n`);
}

// ── 5. Events ─────────────────────────────────────────────────────────────────
async function seedEvents() {
  console.log("▶  Seeding events…");
  let count = 0;
  let skipped = 0;

  for (const e of EVENTS_DATA) {
    const cityId = cityBySlug[e.city];
    if (!cityId) {
      console.warn(`   SKIP event "${e.title}" — unknown city: ${e.city}`);
      skipped++;
      continue;
    }

    await Event.create({
      title:       e.title,
      description: e.description  || "",
      coverImage:  e.coverImage   || "",
      organizer:   e.organizer    || "",
      ticketPrice: e.ticketPrice  ?? 0,
      location:    e.location     || { type: "Point", coordinates: [0, 0] },
      cityId,
      dateRange: {
        from: new Date(e.dateRange.from),
        to:   e.dateRange.to ? new Date(e.dateRange.to) : undefined,
      },
      status:     e.status     || "upcoming",
      isFeatured: e.isFeatured || false,
    });
    count++;
  }

  console.log(`✓  ${count} events seeded${skipped ? ` (${skipped} skipped)` : ""}\n`);
}

// ── 6. Guides ─────────────────────────────────────────────────────────────────
async function seedGuides() {
  console.log("▶  Seeding guide profiles…");
  let count = 0;
  let skipped = 0;

  for (const g of GUIDES_DATA) {
    const user = userByKey[g.userKey];
    if (!user) {
      console.warn(`   SKIP guide — unknown user key: ${g.userKey}`);
      skipped++;
      continue;
    }

    const cityIds = (g.cities || [])
      .map((slug) => cityBySlug[slug])
      .filter(Boolean);

    await GuideProfile.create({
      userId:               user._id,
      tagline:              g.tagline              || "",
      bio:                  g.bio                  || "",
      bannerUrl:            g.bannerUrl            || "",
      specialties:          g.specialties          || [],
      spokenLanguages:      g.spokenLanguages      || [],
      cityIds,
      pricePerHour:         g.pricePerHour         || 0,
      isCurrentlyAvailable: g.isCurrentlyAvailable ?? true,
      verificationStatus:   g.verificationStatus   || "verified",
      averageRating:        g.averageRating        || 0,
      reviewCount:          g.reviewCount          || 0,
      schedule:             g.schedule             || [],
      unavailableDates:     g.unavailableDates      || [],
    });
    count++;
  }

  console.log(`✓  ${count} guide profiles seeded${skipped ? ` (${skipped} skipped)` : ""}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const noClean = process.argv.includes("--no-clean");

  try {
    await connect();

    if (!noClean) {
      await clean();
    }

    await seedUsers();
    await seedCities();
    await seedCategories();
    await seedPlaces();
    await seedEvents();
    await seedGuides();

    console.log("════════════════════════════════════════");
    console.log("✅  Seed completed successfully!");
    console.log(`    Users:      ${USERS_DATA.length}`);
    console.log(`    Cities:     ${CITIES_DATA.length}`);
    console.log(`    Categories: ${CATEGORIES_DATA.length}`);
    console.log(`    Places:     ${PLACES_DATA.length}`);
    console.log(`    Events:     ${EVENTS_DATA.length}`);
    console.log(`    Guides:     ${GUIDES_DATA.length}`);
    console.log("════════════════════════════════════════");
    console.log("\nAdmin credentials:");
    console.log("  Email:    admin@cityguide.ma");
    console.log("  Password: Admin1234!");
    console.log("════════════════════════════════════════\n");

  } catch (err) {
    console.error("❌  Seed failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
