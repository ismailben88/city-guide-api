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
    if (!category) {
      console.warn(`[SearchService] No category found for slug "${dbSlug}" (from "${categorySlug}")`);
      return { category: null, places: [] };
    }

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

// Language is NOT used as a DB filter — it becomes a scoring bonus in ranking.service.
// A hard filter would return zero results when no guides speak the user's language,
// which is worse UX than showing the best available guides with a language score applied.
async function searchGuides(cityId) {
  try {
    const filter = { isCurrentlyAvailable: true, verificationStatus: "verified" };
    if (cityId) filter.cityIds = cityId;

    return GuideProfile.find(filter)
      .populate("userId", "firstName lastName avatarUrl")
      .sort({ averageRating: -1 })
      .limit(20);   // fetch more so ranking can reorder by language bonus
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

  // Guides — language passed separately for scoring, not DB filtering
  if (categorySlug === "guides") {
    results.guides = await searchGuides(city?._id);
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
