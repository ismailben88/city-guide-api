// ─────────────────────────────────────────────────────────────────────────────
//  Seed script — importe db.json vers MongoDB
//
//  Usage :
//    node scripts/seed.js                      (db.json dans ce dossier)
//    node scripts/seed.js ../front-end/db.json (chemin custom)
//
//  Ce script :
//  1. Mappe les anciens ID string ("u1","c1"...) vers de vrais ObjectIds
//  2. Hache tous les mots de passe en clair
//  3. Insère dans le bon ordre (dépendances d'abord)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const path     = require("path");
const fs       = require("fs");

// ─── Modèles ─────────────────────────────────────────────────────────────────
const User           = require("../model/User");
const City           = require("../model/City");
const Category       = require("../model/Category");
const GuideProfile   = require("../model/GuideProfile");
const Place          = require("../model/Place");
const Event          = require("../model/Event");
const Score          = require("../model/Score");
const Comment        = require("../model/Comment");
const Media          = require("../model/Media");
const Favorite       = require("../model/Favorite");
const Report         = require("../model/Report");
const Notification   = require("../model/Notification");
const PendingRequest = require("../model/PendingRequest");
const AdminLog       = require("../model/AdminLog");

// ─── Chargement db.json ───────────────────────────────────────────────────────
const dbPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "..", "db.json");

if (!fs.existsSync(dbPath)) {
  console.error(`db.json introuvable : ${dbPath}`);
  console.error("Usage : node scripts/seed.js [chemin/vers/db.json]");
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

// ─── Table de correspondance : ancien ID → ObjectId ───────────────────────────
const idMap = new Map();

function newId(oldId) {
  if (!idMap.has(oldId)) idMap.set(oldId, new mongoose.Types.ObjectId());
  return idMap.get(oldId);
}

function mapId(oldId) {
  return oldId ? idMap.get(oldId) || null : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hash = (plain) => bcrypt.hash(plain, 12);

// ─── Connexion ───────────────────────────────────────────────────────────────
async function connect() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("MongoDB connecté ✓");
}

// ─── Nettoyage des collections ────────────────────────────────────────────────
async function clearAll() {
  const models = [User, City, Category, GuideProfile, Place, Event,
                  Score, Comment, Media, Favorite, Report,
                  Notification, PendingRequest, AdminLog];
  for (const M of models) await M.deleteMany({});
  console.log("Collections vidées ✓");
}

// ─── 1. Pré-calcul de tous les IDs ───────────────────────────────────────────
function precomputeIds() {
  const collections = [
    "users","cities","categories","guideProfiles","places","events",
    "scores","comments","media","favorites","reports","notifications",
    "pendingRequests","adminLogs","businesses",
  ];
  for (const col of collections) {
    (db[col] || []).forEach((doc) => {
      if (doc.id) newId(doc.id);
    });
  }
  console.log(`${idMap.size} IDs pré-calculés ✓`);
}

// ─── 2. Users ────────────────────────────────────────────────────────────────
async function seedUsers() {
  const docs = [];
  for (const u of (db.users || [])) {
    const plainPassword = u.passwordHash || u.password || "password123";
    const passwordHash  = await hash(plainPassword);

    // Certains users du db.json ont "name" au lieu de firstName/lastName
    let firstName = u.firstName;
    let lastName  = u.lastName;
    if (!firstName && u.name) {
      const parts = u.name.trim().split(" ");
      firstName   = parts[0] || "User";
      lastName    = parts.slice(1).join(" ") || "-";
    }

    docs.push({
      _id:         newId(u.id),
      firstName:   firstName || "User",
      lastName:    lastName  || "-",
      email:       u.email,
      passwordHash,
      role:        u.role || "user",
      isGuide:     u.isGuide  || false,
      isVerified:  u.isVerified !== undefined ? u.isVerified : true,
      isActive:    u.isActive  !== undefined ? u.isActive  : true,
      avatarUrl:   u.avatarUrl || u.avatar || "",
      phone:       u.phone     || "",
      whatsapp:    u.whatsapp  || "",
      instagram:   u.instagram || "",
      website:     u.website   || "",
      createdAt:   u.createdAt ? new Date(u.createdAt) : new Date(),
    });
  }
  await User.insertMany(docs, { ordered: false });
  console.log(`${docs.length} users insérés ✓`);
}

// ─── 3. Cities ───────────────────────────────────────────────────────────────
async function seedCities() {
  const docs = (db.cities || []).map((c) => ({
    _id:      newId(c.id),
    name:     c.name,
    slug:     c.slug,
    region:   c.region || "",
    location: c.location || { type: "Point", coordinates: [0, 0] },
    isActive: c.isActive !== undefined ? c.isActive : true,
    createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
  }));
  await City.insertMany(docs, { ordered: false });
  console.log(`${docs.length} cities insérées ✓`);
}

// ─── 4. Categories ───────────────────────────────────────────────────────────
async function seedCategories() {
  const seenSlugs = new Set();
  const docs = (db.categories || []).map((c) => {
    // Rend le slug unique si db.json contient des doublons
    let slug = c.slug || c.name.toLowerCase().replace(/\s+/g, "-");
    if (seenSlugs.has(slug)) slug = `${slug}-${c.id}`;
    seenSlugs.add(slug);

    return {
      _id:      newId(c.id),
      name:     c.name,
      slug,
      icon:     c.icon || "",
      parentId: mapId(c.parentId),
      status:   c.status || "active",
    };
  });
  await Category.insertMany(docs, { ordered: false });
  console.log(`${docs.length} categories insérées ✓`);
}

// ─── 5. Places ───────────────────────────────────────────────────────────────
async function seedPlaces() {
  const docs = (db.places || []).map((p) => ({
    _id:                newId(p.id),
    name:               p.name,
    slug:               p.slug || p.name.toLowerCase().replace(/\s+/g, "-"),
    categoryId:         mapId(p.categoryId),
    cityId:             mapId(p.cityId),
    location:           p.location || { type: "Point", coordinates: [0, 0] },
    isVerifiedBusiness: p.isVerifiedBusiness || false,
    ownerId:            mapId(p.ownerId),
    averageRating:      p.averageRating || 0,
    reviewCount:        p.reviewCount   || 0,
    status:             p.status     || "active",
    isFeatured:         p.isFeatured || false,
    priceRange:         p.priceRange || "",
    createdAt:          p.createdAt ? new Date(p.createdAt) : new Date(),
  }));
  if (docs.length) await Place.insertMany(docs, { ordered: false });
  console.log(`${docs.length} places insérées ✓`);
}

// ─── 6. GuideProfiles ────────────────────────────────────────────────────────
async function seedGuideProfiles() {
  const docs = (db.guideProfiles || []).map((g) => ({
    _id:                newId(g.id),
    userId:             mapId(g.userId),
    bio:                g.bio || "",
    tagline:            g.tagline            || "",
    bannerUrl:          g.bannerImage        || g.bannerUrl || "",
    specialties:        g.specialties        || [],
    spokenLanguages:    g.spokenLanguages    || [],
    cityIds:            (g.cityIds || []).map(mapId).filter(Boolean),
    pricePerHour:       g.pricePerHour       || 0,
    isCurrentlyAvailable: g.availability?.isCurrentlyAvailable ?? true,
    schedule:           g.availability?.schedule || [],
    unavailableDates:   g.availability?.unavailableDates || [],
    availability:       g.availability       || {},
    verificationStatus: g.verificationStatus || "verified",
    averageRating:      g.averageRating      || 0,
    reviewCount:        g.reviewCount        || 0,
    createdAt:          g.createdAt ? new Date(g.createdAt) : new Date(),
  }));
  if (docs.length) await GuideProfile.insertMany(docs, { ordered: false });
  console.log(`${docs.length} guideProfiles insérés ✓`);
}

// ─── 7. Events ───────────────────────────────────────────────────────────────
async function seedEvents() {
  const docs = (db.events || []).map((e) => ({
    _id:         newId(e.id),
    title:       e.title,
    location:    e.location || { type: "Point", coordinates: [0, 0] },
    cityId:      mapId(e.cityId),
    dateRange:   {
      from: e.dateRange?.from ? new Date(e.dateRange.from) : new Date(),
      to:   e.dateRange?.to   ? new Date(e.dateRange.to)   : null,
    },
    organizedBy: mapId(e.organizedBy || e.organisedBy),
    status:      e.status     || "upcoming",
    isFeatured:  e.isFeatured || false,
    createdAt:   e.createdAt ? new Date(e.createdAt) : new Date(),
  }));
  if (docs.length) await Event.insertMany(docs, { ordered: false });
  console.log(`${docs.length} events insérés ✓`);
}

// ─── 8. Comments ─────────────────────────────────────────────────────────────
async function seedComments() {
  const docs = (db.comments || []).map((c) => ({
    _id:             newId(c.id),
    targetId:        mapId(c.targetId),
    targetType:      c.targetType || "Place",
    authorId:        mapId(c.authorId || c.userId),
    content:         c.content || c.text || "",
    parentCommentId: mapId(c.parentCommentId),
    status:          c.status    || "active",
    likeCount:       c.likeCount || c.likes || 0,
    createdAt:       c.createdAt ? new Date(c.createdAt) : new Date(),
  }));
  if (docs.length) await Comment.insertMany(docs, { ordered: false });
  console.log(`${docs.length} comments insérés ✓`);
}

// ─── 9. Scores ───────────────────────────────────────────────────────────────
async function seedScores() {
  const raw = (db.scores || []).map((s) => ({
    _id:        newId(s.id),
    targetId:   mapId(s.targetId),
    targetType: s.targetType || "Place",
    score:      s.score || s.rating || 5,
    authorId:   mapId(s.authorId || s.userId),
    createdAt:  s.createdAt ? new Date(s.createdAt) : new Date(),
  }));

  // Déduplique après mapping (clé sur les vrais ObjectIds)
  const seen = new Map();
  for (const doc of raw) {
    if (!doc.targetId || !doc.authorId) continue; // ignore orphelins
    const key = `${doc.authorId}__${doc.targetId}__${doc.targetType}`;
    if (!seen.has(key)) seen.set(key, doc);
  }

  const docs = [...seen.values()];
  if (docs.length) await Score.insertMany(docs, { ordered: false });
  console.log(`${docs.length} scores insérés ✓`);
}

// ─── 10. Favorites ───────────────────────────────────────────────────────────
async function seedFavorites() {
  const docs = (db.favorites || []).map((f) => ({
    _id:        newId(f.id),
    userId:     mapId(f.userId),
    targetId:   mapId(f.targetId),
    targetType: f.targetType || "Place",
    createdAt:  f.createdAt ? new Date(f.createdAt) : new Date(),
  }));
  if (docs.length) await Favorite.insertMany(docs, { ordered: false });
  console.log(`${docs.length} favorites insérés ✓`);
}

// ─── 11. Media ───────────────────────────────────────────────────────────────
async function seedMedia() {
  const docs = (db.media || []).map((m) => ({
    _id:        newId(m.id),
    url:        m.url,
    type:       m.type       || "image",
    parentType: m.parentType || "Place",
    parentId:   mapId(m.parentId),
    uploadedBy: mapId(m.uploadedBy || m.userId),
    order:      m.order      || 0,
    status:     m.status     || "approved",
    caption:    m.caption    || "",
    createdAt:  m.createdAt ? new Date(m.createdAt) : new Date(),
  }));
  if (docs.length) await Media.insertMany(docs, { ordered: false });
  console.log(`${docs.length} media insérés ✓`);
}

// ─── 12. Reports ─────────────────────────────────────────────────────────────
async function seedReports() {
  const docs = (db.reports || []).map((r) => ({
    _id:        newId(r.id),
    targetId:   mapId(r.targetId),
    targetType: r.targetType  || "Place",
    reportedBy: mapId(r.reportedBy || r.userId),
    reason:     r.reason      || "Non précisé",
    status:     r.status      || "open",
    reviewedBy: mapId(r.reviewedBy),
    note:       r.note        || "",
    createdAt:  r.createdAt ? new Date(r.createdAt) : new Date(),
  }));
  if (docs.length) await Report.insertMany(docs, { ordered: false });
  console.log(`${docs.length} reports insérés ✓`);
}

// ─── 13. Notifications ───────────────────────────────────────────────────────
async function seedNotifications() {
  const docs = (db.notifications || []).map((n) => ({
    _id:       newId(n.id),
    userId:    mapId(n.userId),
    title:     n.title   || "Notification",
    message:   n.message || n.body || "",
    type:      n.type    || "info",
    isRead:    n.isRead  !== undefined ? n.isRead : false,
    link:      n.link    || "",
    createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
  }));
  if (docs.length) await Notification.insertMany(docs, { ordered: false });
  console.log(`${docs.length} notifications insérées ✓`);
}

// ─── 14. PendingRequests ─────────────────────────────────────────────────────
async function seedPendingRequests() {
  const docs = (db.pendingRequests || []).map((r) => ({
    _id:         newId(r.id),
    requestType: r.requestType || "guide_application",
    requestedBy: mapId(r.requestedBy || r.userId),
    placeId:     mapId(r.placeId),
    payload:     r.payload || {},
    status:      r.status  || "pending",
    reviewedBy:  mapId(r.reviewedBy),
    createdAt:   r.createdAt ? new Date(r.createdAt) : new Date(),
  }));
  if (docs.length) await PendingRequest.insertMany(docs, { ordered: false });
  console.log(`${docs.length} pendingRequests insérés ✓`);
}

// ─── 15. AdminLogs ───────────────────────────────────────────────────────────
async function seedAdminLogs() {
  const docs = (db.adminLogs || []).map((l) => ({
    _id:        newId(l.id),
    adminId:    mapId(l.adminId),
    action:     l.action     || "unknown",
    targetType: l.targetType || "User",
    targetId:   mapId(l.targetId),
    metadata:   l.metadata   || {},
    createdAt:  l.createdAt ? new Date(l.createdAt) : new Date(),
  }));
  if (docs.length) await AdminLog.insertMany(docs, { ordered: false });
  console.log(`${docs.length} adminLogs insérés ✓`);
}

// ─── Sauvegarde du mapping ID (pour debug) ───────────────────────────────────
function saveIdMapping() {
  const mapping = {};
  idMap.forEach((objectId, oldId) => {
    mapping[oldId] = objectId.toString();
  });
  const outPath = path.join(__dirname, "id-mapping.json");
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping sauvegardé → scripts/id-mapping.json ✓`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await connect();
    await clearAll();

    precomputeIds();

    // Ordre d'insertion : indépendants → dépendants
    await seedUsers();
    await seedCities();
    await seedCategories();
    await seedPlaces();
    await seedGuideProfiles();
    await seedEvents();
    await seedComments();
    await seedScores();
    await seedFavorites();
    await seedMedia();
    await seedReports();
    await seedNotifications();
    await seedPendingRequests();
    await seedAdminLogs();

    saveIdMapping();

    console.log("\n✅  Seed terminé avec succès !");
  } catch (err) {
    console.error("❌  Erreur seed :", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
