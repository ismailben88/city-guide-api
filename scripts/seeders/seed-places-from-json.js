require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Place = require("../../models/Place");
const City = require("../../models/City");
const Category = require("../../models/Category");

const DATA_DIR = path.resolve(__dirname, "../../../data/places");

const FRENCH_TO_EN_SLUG = {
  "monuments-historiques": "historical-sites",
  "musees-galeries":       "museums",
  "plages-mediterranee":   "med-beaches",
  "plages-atlantique":     "atlantic-beaches",
  "souks-traditionnels":   "souks",
  "restaurants":           "restaurants",
  "cafes-salons-the":      "cafes",
  "hebergement":           "hotels",
  "tapis-textiles":        "berber-crafts",
  "jardins-parcs":         "national-parks",
  "hotels-luxe":           "luxury-hotels",
  "bars-rooftops":         "bars-lounges",
  "palais-kasbahs":        "palaces-kasbahs",
  "sites-archeologiques":  "roman-ruins",
  "sports-nautiques":      "kitesurfing",
  "vie-nocturne":          "nightlife",
  "cascades-gorges":       "waterfalls",
  "desert-sahara":         "desert",
  "street-food":           "street-food-stalls",
  "riads":                 "riads",
  "quad-buggy":            "desert-tours",
  "bivouacs-desertiques":  "desert-camps",
  "equitation":            "camel-trekking",
  "forets-vallees":        "mountains",
  "ateliers-artisanaux":   "artisan-workshops",
  "mosquees":              "mosques",
  "medinas-souks":         "medinas",
  "bien-etre-spa":         "hammams",
  "nature-randonnees":     "hiking-trekking",
  "ski-sports-hiver":      "sports",
  "golf":                  "golf",
  "parcs-nationaux":       "national-parks",
  "sports-aventure":       "sports",
  "cuisine-marocaine":     "moroccan-cuisine",
  "centres-commerciaux":   "shopping",
  "epices-produits-locaux":"argan-products",
  "montagne-atlas":        "mountains",
  "poterie-ceramique":     "berber-crafts",
  "phares-tours":          "historical-sites",
  "ville-nouvelle":        "city-tours",
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
  console.log("✓ MongoDB connected\n");

  const cityDocs = await City.find({}).lean();
  const cityBySlug = {};
  for (const c of cityDocs) {
    cityBySlug[c.slug] = c._id;
  }

  const catDocs = await Category.find({}).lean();
  const categoryBySlug = {};
  for (const c of catDocs) {
    categoryBySlug[c.slug] = c._id;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  const allPlaces = [];

  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
    const cityKey = path.basename(file, ".json");
    const cityId = cityBySlug[cityKey];

    if (!cityId) {
      console.warn(`  SKIP ${file} — unknown city slug: ${cityKey}`);
      continue;
    }

    for (const p of json) {
      const enSlug = FRENCH_TO_EN_SLUG[p.categoryId];
      if (!enSlug) {
        console.warn(`  SKIP "${p.name}" — unknown category: ${p.categoryId}`);
        continue;
      }
      const categoryId = categoryBySlug[enSlug];
      if (!categoryId) {
        console.warn(`  SKIP "${p.name}" — category not in DB: ${enSlug} (from ${p.categoryId})`);
        continue;
      }

      const t = p.translations || {};
      const en = t.en || {};
      const fallbackName  = p.name.replace(/_/g, " ");
      const fallbackDesc  = p.shortDescription || "";
      const finalName     = en.name        || fallbackName;
      const finalDesc     = en.description || fallbackDesc;
      const finalImages   = (p.images && p.images.length) ? p.images : [];

      allPlaces.push({
        name:               finalName,
        slug:               p.slug,
        categoryId,
        cityId,
        description:        finalDesc,
        address:            "",
        images:             finalImages,
        location:           { type: "Point", coordinates: [p.lng, p.lat] },
        priceRange:         p.priceRange || "",
        isFeatured:         false,
        averageRating:      0,
        reviewCount:        0,
        status:             "active",
        isVerifiedBusiness: false,
        sourceLang:         "fr",
        translationStatus:  "done",
        translations:       t,
      });
    }
  }

  console.log(`▶  Seeding ${allPlaces.length} places…`);

  if (allPlaces.length) {
    await Place.deleteMany({});
    await Place.insertMany(allPlaces, { ordered: false });
  }

  console.log(`✓  ${allPlaces.length} places seeded\n`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(err => {
  console.error("❌  Failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
