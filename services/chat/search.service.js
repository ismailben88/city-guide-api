const Place = require("../../models/Place");
const City = require("../../models/City");
const Category = require("../../models/Category");
const GuideProfile = require("../../models/GuideProfile");
const Event = require("../../models/Event");

const CATEGORY_DB_SLUGS = {
  restaurants: "restaurant",
  cafes: "cafe",
  hotels: "riad-stay",
  beaches: "plage",
  "site-historique": "site-historique",
  musee: "musee",
  "parc-jardin": "parc-jardin",
  "marche-souk": "marche-souk",
};

async function searchCity(citySlug) {
  if (!citySlug) return null;
  try {
    return await City.findOne({ slug: citySlug, isActive: true });
  } catch (err) {
    console.error("[SearchService] City lookup error:", err.message);
    return null;
  }
}

async function searchPlacesByCategory(cityId, categorySlug) {
  try {
    let dbSlug = CATEGORY_DB_SLUGS[categorySlug] || categorySlug;
    const category = await Category.findOne({ slug: dbSlug, status: "active" });
    if (!category) return { category: null, places: [] };

    const filter = { categoryId: category._id, status: "active" };
    if (cityId) filter.cityId = cityId;

    const places = await Place.find(filter)
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ averageRating: -1 })
      .limit(15);

    return { category, places };
  } catch (err) {
    console.error("[SearchService] Places search error:", err.message);
    return { category: null, places: [] };
  }
}

async function searchAllPlacesInCity(cityId) {
  try {
    return await Place.find({ cityId, status: "active" })
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ averageRating: -1 })
      .limit(15);
  } catch (err) {
    console.error("[SearchService] City places search error:", err.message);
    return [];
  }
}

async function searchTopPlaces() {
  try {
    return await Place.find({ status: "active" })
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ averageRating: -1 })
      .limit(15);
  } catch (err) {
    console.error("[SearchService] Top places error:", err.message);
    return [];
  }
}

async function searchGuides(cityId, language) {
  try {
    const filter = { isCurrentlyAvailable: true, verificationStatus: "verified" };
    if (cityId) filter.cityIds = cityId;

    let guides = await GuideProfile.find(filter)
      .populate("userId", "firstName lastName avatarUrl")
      .sort({ averageRating: -1 })
      .limit(15);

    if (language) {
      const lang = language.toLowerCase();
      guides = guides.filter((g) => {
        const langs = (g.spokenLanguages || []).map((l) =>
          typeof l === "string" ? l.toLowerCase() : (l.code || "").toLowerCase()
        );
        return langs.includes(lang);
      });
    }

    return guides;
  } catch (err) {
    console.error("[SearchService] Guides search error:", err.message);
    return [];
  }
}

async function searchEvents(cityId) {
  try {
    const filter = { status: { $in: ["upcoming", "ongoing"] } };
    if (cityId) filter.cityId = cityId;

    return await Event.find(filter)
      .populate("cityId", "name slug")
      .sort({ "dateRange.from": 1 })
      .limit(15);
  } catch (err) {
    console.error("[SearchService] Events search error:", err.message);
    return [];
  }
}

async function runSearch(citySlug, categorySlug, language) {
  const city = await searchCity(citySlug);
  const results = { city, category: null };

  // Guides
  if (categorySlug === "guides") {
    results.guides = await searchGuides(city?._id, language);
    return results;
  }

  // Events
  if (categorySlug === "events") {
    results.events = await searchEvents(city?._id);
    return results;
  }

  // Places by specific category
  if (categorySlug) {
    const { category, places } = await searchPlacesByCategory(city?._id, categorySlug);
    results.category = category;
    results.places = places;
    return results;
  }

  // City but no category → all top places in that city
  if (city) {
    results.places = await searchAllPlacesInCity(city._id);
    return results;
  }

  // No city, no category → top places overall
  results.places = await searchTopPlaces();
  return results;
}

module.exports = { runSearch, searchCity, searchPlacesByCategory, searchAllPlacesInCity, searchTopPlaces, searchGuides, searchEvents };
