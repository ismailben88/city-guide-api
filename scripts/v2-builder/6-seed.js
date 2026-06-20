#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  6-seed.js — Seeds city_guide_v2 MongoDB database
//
//  Inputs:
//    · data/cities-45.js              (45 Moroccan cities)
//    · seeders/data/categories.js     (80 categories — reused)
//    · seeders/data/users.js          (users — reused)
//    · seeders/data/guides.js         (guides — reused)
//    · output/places-final.json       (from 5-build-final.js)
//    · data/events-120.js             (120+ events)
//
//  Output: writes to MongoDB database "city_guide_v2"
//
//  Usage:
//    node backend/scripts/v2-builder/6-seed.js              (clean + seed)
//    node backend/scripts/v2-builder/6-seed.js --append     (no clean)
// ─────────────────────────────────────────────────────────────────────────────
"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const fs       = require("fs");
const path     = require("path");

const User          = require("../../models/User");
const City          = require("../../models/City");
const Category      = require("../../models/Category");
const Place         = require("../../models/Place");
const Event         = require("../../models/Event");
const GuideProfile  = require("../../models/GuideProfile");
const Comment       = require("../../models/Comment");
const Score         = require("../../models/Score");
const Favorite      = require("../../models/Favorite");
const Media         = require("../../models/Media");
const Report        = require("../../models/Report");
const Notification  = require("../../models/Notification");
const PendingRequest = require("../../models/PendingRequest");
const AdminLog      = require("../../models/AdminLog");

const CITIES_DATA     = require("./data/cities-45");
const CATEGORIES_DATA = require("../seeders/data/categories");
const USERS_DATA      = require("../seeders/data/users");
const GUIDES_DATA     = require("../seeders/data/guides");
const EVENTS_DATA     = require("./data/events-120");

const PLACES_FILE = path.resolve(__dirname, "output/places-final.json");
if (!fs.existsSync(PLACES_FILE)) {
  console.error("✗ output/places-final.json not found. Run 5-build-final.js first.");
  process.exit(1);
}
const PLACES_DATA = JSON.parse(fs.readFileSync(PLACES_FILE, "utf8"));

const DB_NAME = "city_guide_v2";
const APPEND  = process.argv.includes("--append");

// ── Lookup maps ─────────────────────────────────────────────────────────────
const userByKey      = {};
const cityBySlug     = {};
const categoryBySlug = {};

const CLEAN_COLLECTIONS = [
  User, City, Category, Place, Event, GuideProfile,
  Comment, Score, Favorite, Media, Report, Notification,
  PendingRequest, AdminLog,
];

// ── Translations (cities + categories) ──────────────────────────────────────
const CITY_FR = {
  Marrakech:"Marrakech", Fes:"Fès", Meknes:"Meknès", Rabat:"Rabat",
  Casablanca:"Casablanca", Mohammedia:"Mohammedia", "El Jadida":"El Jadida",
  Safi:"Safi", Essaouira:"Essaouira", Oualidia:"Oualidia", Salé:"Salé",
  Kenitra:"Kénitra", Tangier:"Tanger", Tetouan:"Tétouan",
  Chefchaouen:"Chefchaouen", Asilah:"Asilah", Larache:"Larache",
  "Al Hoceima":"Al Hoceïma", Akchour:"Akchour", "Ksar el-Kebir":"Ksar el-Kébir",
  Nador:"Nador", Saidia:"Saïdia", Berkane:"Berkane", Oujda:"Oujda",
  Agadir:"Agadir", Taghazout:"Taghazout", Mirleft:"Mirleft",
  "Sidi Ifni":"Sidi Ifni", Taroudant:"Taroudant", Tafraoute:"Tafraoute",
  Dakhla:"Dakhla", Laayoune:"Laâyoune", Ouarzazate:"Ouarzazate",
  "Aït Benhaddou":"Aït Benhaddou", Merzouga:"Merzouga", Errachidia:"Errachidia",
  Tinghir:"Tinghir", Zagora:"Zagora", "M'Hamid":"M'Hamid", Ifrane:"Ifrane",
  Imlil:"Imlil", Asni:"Asni", Midelt:"Midelt", Sefrou:"Sefrou",
  "Beni Mellal":"Béni Mellal", Khouribga:"Khouribga",
};

const CITY_AR = {
  Marrakech:"مراكش", Fes:"فاس", Meknes:"مكناس", Rabat:"الرباط",
  Casablanca:"الدار البيضاء", Mohammedia:"المحمدية", "El Jadida":"الجديدة",
  Safi:"آسفي", Essaouira:"الصويرة", Oualidia:"الواليدية", Salé:"سلا",
  Kenitra:"القنيطرة", Tangier:"طنجة", Tetouan:"تطوان",
  Chefchaouen:"شفشاون", Asilah:"أصيلة", Larache:"العرائش",
  "Al Hoceima":"الحسيمة", Akchour:"أكشور", "Ksar el-Kebir":"القصر الكبير",
  Nador:"الناظور", Saidia:"السعيدية", Berkane:"بركان", Oujda:"وجدة",
  Agadir:"أكادير", Taghazout:"تغازوت", Mirleft:"ميرلفت",
  "Sidi Ifni":"سيدي إفني", Taroudant:"تارودانت", Tafraoute:"تافراوت",
  Dakhla:"الداخلة", Laayoune:"العيون", Ouarzazate:"ورزازات",
  "Aït Benhaddou":"آيت بن حدو", Merzouga:"مرزوكة", Errachidia:"الرشيدية",
  Tinghir:"تنغير", Zagora:"زاكورة", "M'Hamid":"امحاميد", Ifrane:"إفران",
  Imlil:"إمليل", Asni:"أسني", Midelt:"ميدلت", Sefrou:"صفرو",
  "Beni Mellal":"بني ملال", Khouribga:"خريبكة",
};

function cityTranslations(name, region) {
  return {
    fr: { name: CITY_FR[name] || name, region: region || "" },
    en: { name, region: region || "" },
    ar: { name: CITY_AR[name] || name, region: region || "" },
  };
}

// Categories — reuse the rich translation map from seed-v2.js
const CAT_FR = {
  "Restaurants":"Restaurants","Cafes & Rooftops":"Cafés & Rooftops","Hotels":"Hôtels","Riads":"Riads",
  "Historical Sites":"Sites Historiques","Museums & Culture":"Musées & Culture","Beaches":"Plages",
  "Nature & Landscapes":"Nature & Paysages","Desert Experiences":"Expériences Désertiques",
  "Shopping & Souks":"Shopping & Souks","Wellness & Spa":"Bien-être & Spa","Nightlife":"Vie Nocturne",
  "Sports & Activities":"Sports & Activités","Coworking":"Coworking","Tours & Excursions":"Tours & Excursions",
  "Photography Spots":"Spots Photo","Family Activities":"Activités Familiales","Religious Sites":"Sites Religieux",
  "Art & Galleries":"Art & Galeries","Street Food & Markets":"Street Food & Marchés",
  "Moroccan Cuisine":"Cuisine Marocaine","Fine Dining":"Gastronomie","Seafood & Fish":"Fruits de Mer & Poisson",
  "Rooftop Cafes":"Cafés sur les Toits","Traditional Moroccan Cafes":"Cafés Marocains Traditionnels",
  "Specialty Coffee":"Café de Spécialité","Luxury Hotels & Palaces":"Hôtels de Luxe & Palais",
  "Boutique Hotels":"Hôtels Boutique","Eco-Lodges & Glamping":"Éco-Lodges & Glamping",
  "Luxury Riads":"Riads de Luxe","Heritage Riads":"Riads Historiques","Riad Guesthouses":"Maisons d'Hôtes Riad",
  "Medinas & Old Towns":"Médinas & Vieilles Villes","Palaces & Kasbahs":"Palais & Kasbahs",
  "Roman & Ancient Ruins":"Ruines Romaines & Antiques","Art Museums":"Musées d'Art",
  "History & Archaeology":"Histoire & Archéologie","Crafts & Traditional Arts":"Artisanat & Arts Traditionnels",
  "Atlantic Beaches":"Plages Atlantiques","Mediterranean Beaches":"Plages Méditerranéennes",
  "Surf Spots":"Spots de Surf","Mountains & Atlas":"Montagnes & Atlas",
  "Waterfalls & Gorges":"Cascades & Gorges","National Parks & Reserves":"Parcs Nationaux & Réserves",
  "Desert Camps":"Camps Désertiques","Camel Trekking":"Randonnées à Chameau",
  "Sand Dunes & Ergs":"Dunes de Sable & Ergs","Souks & Bazaars":"Souks & Bazars",
  "Berber Crafts & Rugs":"Artisanat Berbère & Tapis","Argan & Natural Products":"Argan & Produits Naturels",
  "Traditional Hammams":"Hammams Traditionnels","Luxury Spas":"Spas de Luxe",
  "Yoga & Meditation":"Yoga & Méditation","Bars & Lounges":"Bars & Salons",
  "Live Music & Concerts":"Musique Live & Concerts","Clubs & Dance Floors":"Clubs & Pistes de Danse",
  "Hiking & Trekking":"Randonnée & Trekking","Kitesurfing & Windsurfing":"Kitesurf & Windsurf",
  "Golf":"Golf","Coworking Spaces":"Espaces de Coworking","Startup Hubs":"Pôles Startups",
  "Business Centers":"Centres d'Affaires","City Walking Tours":"Visites à Pied de la Ville",
  "Desert Safari Tours":"Safaris Désertiques","Food & Culinary Tours":"Tours Gastronomiques",
  "Sunset & Sunrise Spots":"Spots Coucher & Lever de Soleil","Rooftop & Terrace Views":"Vues sur les Toits & Terrasses",
  "Street Photography":"Photographie de Rue","Theme Parks & Attractions":"Parcs d'Attractions",
  "Kids Activities":"Activités pour Enfants","Family-Friendly Beaches":"Plages Familiales",
  "Mosques":"Mosquées","Mausoleums & Zaouias":"Mausolées & Zaouias","Quranic Schools":"Écoles Coraniques",
  "Contemporary Art Galleries":"Galeries d'Art Contemporain","Artisan Workshops":"Ateliers d'Artisanat",
  "Street Art & Murals":"Street Art & Fresques","Street Food Stalls":"Étalages de Street Food",
  "Food Markets & Souks":"Marchés Alimentaires & Souks","Traditional Bakeries":"Boulangeries Traditionnelles",
};

const CAT_AR = {
  "Restaurants":"مطاعم","Cafes & Rooftops":"مقاهي & أسطح","Hotels":"فنادق","Riads":"رياض",
  "Historical Sites":"مواقع تاريخية","Museums & Culture":"متاحف & ثقافة","Beaches":"شواطئ",
  "Nature & Landscapes":"طبيعة & مناظر","Desert Experiences":"تجارب صحراوية","Shopping & Souks":"تسوق & أسواق",
  "Wellness & Spa":"عناية & سبا","Nightlife":"حياة ليلية","Sports & Activities":"رياضة & أنشطة",
  "Coworking":"مساحات عمل مشتركة","Tours & Excursions":"جولات & رحلات","Photography Spots":"مواقع تصوير",
  "Family Activities":"أنشطة عائلية","Religious Sites":"مواقع دينية","Art & Galleries":"فن & صالات عرض",
  "Street Food & Markets":"طعام الشارع & أسواق","Moroccan Cuisine":"مطبخ مغربي","Fine Dining":"مأكولات راقية",
  "Seafood & Fish":"مأكولات بحرية & سمك","Rooftop Cafes":"مقاهي على الأسطح",
  "Traditional Moroccan Cafes":"مقاهي مغربية تقليدية","Specialty Coffee":"قهوة متخصصة",
  "Luxury Hotels & Palaces":"فنادق فاخرة & قصور","Boutique Hotels":"فنادق بوتيك",
  "Eco-Lodges & Glamping":"نزل بيئية & تخييم فاخر","Luxury Riads":"رياض فاخرة","Heritage Riads":"رياض تراثية",
  "Riad Guesthouses":"بيوت ضيافة رياض","Medinas & Old Towns":"مدن قديمة & أسواق",
  "Palaces & Kasbahs":"قصور & قصبات","Roman & Ancient Ruins":"آثار رومانية & قديمة",
  "Art Museums":"متاحف فنية","History & Archaeology":"تاريخ & آثار",
  "Crafts & Traditional Arts":"حرف & فنون تقليدية","Atlantic Beaches":"شواطئ أطلسية",
  "Mediterranean Beaches":"شواطئ متوسطية","Surf Spots":"مواقع ركوب الأمواج","Mountains & Atlas":"جبال & أطلس",
  "Waterfalls & Gorges":"شلالات & أودية","National Parks & Reserves":"متنزهات وطنية & محميات",
  "Desert Camps":"مخيمات صحراوية","Camel Trekking":"رحلات الجمال","Sand Dunes & Ergs":"كثبان رملية",
  "Souks & Bazaars":"أسواق & بازارات","Berber Crafts & Rugs":"حرف أمازيغية & سجاد",
  "Argan & Natural Products":"أرغان & منتجات طبيعية","Traditional Hammams":"حمامات تقليدية",
  "Luxury Spas":"سبا فاخر","Yoga & Meditation":"يوجا & تأمل","Bars & Lounges":"بارات & صالات",
  "Live Music & Concerts":"موسيقى حية & حفلات","Clubs & Dance Floors":"نوادٍ & حلقات رقص",
  "Hiking & Trekking":"تنزه & رحلات","Kitesurfing & Windsurfing":"ركوب الأمواج بالطائرات",
  "Golf":"جولف","Coworking Spaces":"مساحات عمل مشتركة","Startup Hubs":"مراكز الشركات الناشئة",
  "Business Centers":"مراكز أعمال","City Walking Tours":"جولات مشي في المدينة",
  "Desert Safari Tours":"جولات سفاري صحراوية","Food & Culinary Tours":"جولات طهي",
  "Sunset & Sunrise Spots":"مواقع غروب & شروق الشمس","Rooftop & Terrace Views":"إطلالات على الأسطح",
  "Street Photography":"تصوير الشوارع","Theme Parks & Attractions":"متنزهات ترفيهية & معالم جذب",
  "Kids Activities":"أنشطة للأطفال","Family-Friendly Beaches":"شواطئ عائلية","Mosques":"مساجد",
  "Mausoleums & Zaouias":"أضرحة & زوايا","Quranic Schools":"مدارس قرآنية",
  "Contemporary Art Galleries":"صالات عرض فنية معاصرة","Artisan Workshops":"ورش حرفية",
  "Street Art & Murals":"فن الشارع & جداريات","Street Food Stalls":"أكشاك طعام الشارع",
  "Food Markets & Souks":"أسواق طعام","Traditional Bakeries":"مخابز تقليدية",
};

function catTranslations(name) {
  return {
    fr: { name: CAT_FR[name] || name },
    en: { name },
    ar: { name: CAT_AR[name] || name },
  };
}

function placeTranslations(p) {
  const fr_name = p._name_fr || p.name;
  const ar_name = p._name_ar || p.name;
  return {
    fr: { name: fr_name, description: p.description },
    en: { name: p.name,  description: p.description },
    ar: { name: ar_name, description: p.description },
  };
}

function eventTranslations(e) {
  return {
    fr: { title: e.title, description: e.description },
    en: { title: e.title, description: e.description },
    ar: { title: e.title, description: e.description },
  };
}

// ── Connect ─────────────────────────────────────────────────────────────────
async function connect() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME });
  console.log(`✓ MongoDB connected (${DB_NAME})\n`);
}

async function clean() {
  if (APPEND) {
    console.log("▶ APPEND mode — skipping clean\n");
    return;
  }
  console.log(`▶ Cleaning ${DB_NAME}…`);
  for (const Model of CLEAN_COLLECTIONS) {
    const { deletedCount } = await Model.deleteMany({});
    if (deletedCount) console.log(`   ${Model.modelName}: ${deletedCount} deleted`);
  }
  console.log("✓ Cleaned\n");
}

// ── Seeders ─────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("▶ Seeding users…");
  for (const u of USERS_DATA) {
    const doc = await User.create({
      firstName: u.firstName, lastName: u.lastName, email: u.email,
      passwordHash: u.password,
      role: u.role || "user", isGuide: u.isGuide || false,
      isVerified: u.isVerified !== undefined ? u.isVerified : true,
      isActive: true, avatarUrl: u.avatarUrl || "",
      bio: u.bio || "", city: u.city || "", phone: u.phone || "",
      nationality: u.nationality || "", gender: u.gender || "",
    });
    userByKey[u.key] = doc;
  }
  console.log(`✓ ${USERS_DATA.length} users\n`);
}

async function seedCities() {
  console.log("▶ Seeding cities…");
  // Load city covers if available
  const coversPath = path.resolve(__dirname, "cache/city-covers.json");
  const covers = fs.existsSync(coversPath) ? JSON.parse(fs.readFileSync(coversPath, "utf8")) : {};
  for (const c of CITIES_DATA) {
    const cover = covers[c.key] || {};
    const doc = await City.create({
      name: c.name, slug: c.key, region: c.region, location: c.location,
      coverImage: cover.image || "",
      description: cover.description || "",
      isActive: true,
      translations: cityTranslations(c.name, c.region),
      sourceLang: "en", translationStatus: "done",
    });
    cityBySlug[c.key] = doc._id;
  }
  console.log(`✓ ${CITIES_DATA.length} cities (${Object.keys(covers).length} with cover image)\n`);
}

async function seedCategories() {
  console.log("▶ Seeding categories…");
  for (const c of CATEGORIES_DATA.filter(c => !c.parent)) {
    const doc = await Category.create({
      name: c.name, slug: c.slug, icon: c.icon || "", status: "active",
      translations: catTranslations(c.name),
      sourceLang: "en", translationStatus: "done",
    });
    categoryBySlug[c.slug] = doc._id;
  }
  for (const c of CATEGORIES_DATA.filter(c => c.parent)) {
    const parentId = categoryBySlug[c.parent] || null;
    const doc = await Category.create({
      name: c.name, slug: c.slug, icon: c.icon || "",
      parentId, status: "active",
      translations: catTranslations(c.name),
      sourceLang: "en", translationStatus: "done",
    });
    categoryBySlug[c.slug] = doc._id;
  }
  console.log(`✓ ${CATEGORIES_DATA.length} categories\n`);
}

async function seedPlaces() {
  console.log("▶ Seeding places…");
  let ok = 0, skipped = 0;
  const slugSeen = new Set();
  const BATCH = 200;
  let batch = [];

  async function flush() {
    if (!batch.length) return;
    try { await Place.insertMany(batch, { ordered: false }); }
    catch (e) { /* duplicate slugs survive */ }
    batch = [];
  }

  for (const p of PLACES_DATA) {
    const cityId     = cityBySlug[p.city];
    const categoryId = categoryBySlug[p.category];
    if (!cityId || !categoryId) { skipped++; continue; }

    let slug = p.slug;
    if (slugSeen.has(slug)) {
      slug = `${slug}-${Math.floor(Math.random() * 9999)}`;
    }
    slugSeen.add(slug);

    batch.push({
      name: p.name, slug, categoryId, cityId,
      description: p.description, address: p.address || "",
      images: p.images || [],
      phone: p._phone || "",
      website: p._website || "",
      openingHours: p._openingHours || "",
      tags: p._tags || [],
      location: p.location,
      priceRange: p.priceRange || "",
      entryFee: p.entryFee ?? null,
      isFeatured: !!p.isFeatured,
      averageRating: p.averageRating || 0,
      reviewCount: p.reviewCount || 0,
      status: "active",
      isVerifiedBusiness: false,
      translations: placeTranslations(p),
      sourceLang: "en", translationStatus: "done",
    });
    ok++;
    if (batch.length >= BATCH) {
      await flush();
      process.stdout.write(`\r   inserted: ${ok}`);
    }
  }
  await flush();
  console.log(`\n✓ ${ok} places seeded (${skipped} skipped)\n`);
}

async function seedEvents() {
  console.log("▶ Seeding events…");
  const now = new Date();
  const YEAR_MS = 365.25 * 24 * 3600 * 1000;
  let ok = 0, skipped = 0, shifted = 0;
  for (const e of EVENTS_DATA) {
    const cityId = cityBySlug[e.city];
    if (!cityId) { skipped++; continue; }

    // Auto-shift past events to the next year so calendar stays useful
    let from = new Date(e.dateRange.from);
    let to   = e.dateRange.to ? new Date(e.dateRange.to) : from;
    while (to < now) {
      from = new Date(from.getTime() + YEAR_MS);
      to   = new Date(to.getTime() + YEAR_MS);
      shifted++;
    }

    let status = "upcoming";
    if (now >= from && now <= to) status = "ongoing";

    await Event.create({
      title: e.title, description: e.description,
      coverImage: e.image || "", organizer: e.organizer || "",
      ticketPrice: e.ticketPrice ?? 0,
      cityId,
      dateRange: { from, to: e.dateRange.to ? to : undefined },
      category: e.category || "other",
      status,
      isFeatured: !!e.isFeatured,
      translations: eventTranslations(e),
      sourceLang: "en", translationStatus: "done",
    });
    ok++;
  }
  console.log(`✓ ${ok} events seeded (${shifted} auto-shifted to next year, ${skipped} skipped)\n`);
}

async function seedGuides() {
  console.log("▶ Seeding guides…");
  let ok = 0;
  for (const g of GUIDES_DATA) {
    const user = userByKey[g.userKey];
    if (!user) continue;
    const cityIds = (g.cities || []).map(slug => cityBySlug[slug]).filter(Boolean);
    await GuideProfile.create({
      userId: user._id,
      tagline: g.tagline || "", bio: g.bio || "",
      bannerUrl: g.bannerUrl || "", specialties: g.specialties || [],
      spokenLanguages: g.spokenLanguages || [], cityIds,
      pricePerHour: g.pricePerHour || 0,
      isCurrentlyAvailable: g.isCurrentlyAvailable ?? true,
      verificationStatus: g.verificationStatus || "verified",
      averageRating: g.averageRating || 0, reviewCount: g.reviewCount || 0,
      schedule: g.schedule || [], unavailableDates: g.unavailableDates || [],
    });
    ok++;
  }
  console.log(`✓ ${ok} guides\n`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await connect();
    await clean();
    await seedUsers();
    await seedCities();
    await seedCategories();
    await seedPlaces();
    await seedEvents();
    await seedGuides();

    const counts = {
      users:      await User.countDocuments(),
      cities:     await City.countDocuments(),
      categories: await Category.countDocuments(),
      places:     await Place.countDocuments(),
      events:     await Event.countDocuments(),
      guides:     await GuideProfile.countDocuments(),
    };
    console.log("════════════════════════════════════════");
    console.log(`✅ city_guide_v2 seeded successfully!`);
    console.log(`   Database:   ${DB_NAME}`);
    console.log(`   Users:      ${counts.users}`);
    console.log(`   Cities:     ${counts.cities}`);
    console.log(`   Categories: ${counts.categories}`);
    console.log(`   Places:     ${counts.places}`);
    console.log(`   Events:     ${counts.events}`);
    console.log(`   Guides:     ${counts.guides}`);
    console.log("════════════════════════════════════════");
    console.log("\nAdmin credentials:");
    console.log("  Email:    admin@cityguide.ma");
    console.log("  Password: Admin1234!");
    console.log("════════════════════════════════════════\n");
  } catch (e) {
    console.error("✗ Seed failed:", e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
