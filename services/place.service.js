const Place               = require("../models/Place");
const Favorite            = require("../models/Favorite");
const PendingRequest      = require("../models/PendingRequest");
const Media               = require("../models/Media");
const ApiError            = require("../utils/ApiError");
const { getPagination }   = require("../utils/pagination.utils");
const { translateFields } = require("./translate.service");
const { deleteUploadedFiles } = require("./fileCleanup.service");
const cacheService        = require("./cache.service");
const notify              = require("../helpers/notify");

// Notify all users who favorited a place — fire-and-forget helper
async function notifyFavoriters(placeId, placeName, type) {
  const favs = await Favorite.find({ targetId: placeId, targetType: "Place" }).select("userId").lean();
  if (!favs.length) return;
  const userIds = [...new Set(favs.map((f) => f.userId.toString()))];
  const fn = type === "featured" ? notify.savedPlaceFeatured
           : type === "active"   ? notify.savedPlaceNowActive
           :                       notify.savedPlaceUpdated;
  await Promise.allSettled(userIds.map((uid) => fn(uid, placeName, placeId)));
}

const POPULATE_PLACE = [
  { path: "cityId",     select: "name slug" },
  { path: "categoryId", select: "name slug icon" },
];

// Fields the list view never reads. Excluding them at the projection level
// trims ~16% of the payload (9 KB on a Marrakech first page) without breaking
// any consumer — the detail page goes through `getPlaceById` which still
// returns every field.
const LIST_HIDDEN_FIELDS = {
  __v:                0,
  translationStatus:  0,
  rejectionReason:    0,
  openingHours:       0,
  phone:              0,
  website:            0,
  address:            0,
  ownerId:            0,
};

const getPlaces = async (query) => {
  const {
    cityId, categoryId, status = "active", isFeatured, isVerifiedBusiness,
    search, sortBy = "createdAt", sortDir = "desc",
    ...rest
  } = query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (status !== "all")               filter.status             = status;
  if (cityId)                         filter.cityId             = cityId;
  if (categoryId)                     filter.categoryId         = categoryId;
  if (isFeatured         !== undefined) filter.isFeatured       = isFeatured         === "true";
  if (isVerifiedBusiness !== undefined) filter.isVerifiedBusiness = isVerifiedBusiness === "true";
  if (search) {
    // Broaden text search to name + description + tags (case-insensitive).
    // The name-only regex missed "mosque" when the place name was "Koutoubia"
    // and the user expected a category hit. `$or` keeps the index hint on
    // `name` for the common case + falls through to description / tags.
    const rx = { $regex: search, $options: "i" };
    filter.$or = [
      { name:        rx },
      { description: rx },
      { tags:        rx },
    ];
  }

  const VALID_SORT = ["name", "createdAt", "averageRating", "reviewCount"];
  const sortField  = VALID_SORT.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder  = sortDir === "asc" ? 1 : -1;

  const [places, total] = await Promise.all([
    Place.find(filter, LIST_HIDDEN_FIELDS)
      .populate(POPULATE_PLACE)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Place.countDocuments(filter),
  ]);

  return { places, total, page, limit };
};

const searchPlaces = async ({ q, cityId, categoryId }) => {
  const filter = { status: "active" };
  if (cityId)     filter.cityId     = cityId;
  if (categoryId) filter.categoryId = categoryId;
  if (q)          filter.name       = { $regex: q, $options: "i" };

  return Place.find(filter).populate(POPULATE_PLACE).limit(50);
};

// Geo-indexed proximity search. Use this on ExplorePage when the user has
// granted geolocation and is in "radius mode" — much more accurate than the
// top-N-popular fallback the old code used.
//
// Parameters:
//   lat, lng  required, the user position (degrees, validated to WGS-84 range)
//   radius    metres, default 5 km, capped at 300 km
//   limit     max results, default 50, capped at 500
//
// $near returns results sorted by distance ascending — no manual sort needed.
// Returns [] when lat/lng are missing or out of WGS-84 bounds, so a malformed
// query never throws — the route handler stays predictable.
const getNearbyPlaces = async ({ lat, lng, radius = 5000, limit = 50 }) => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return [];
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return [];

  const safeLimit  = Math.min(500, Math.max(1, Number(limit)  || 50));
  const safeRadius = Math.min(300000, Math.max(1, Number(radius) || 5000));

  // Light projection — drop the fields a list/marker view doesn't render.
  // Saves ~40% bytes on a 300-place response (308 KB → ~180 KB). The detail
  // page still hits `/places/:id` which returns the full document.
  const NEARBY_HIDDEN_FIELDS = {
    __v:               0,
    translationStatus: 0,
    rejectionReason:   0,
    openingHours:      0,
    phone:             0,
    website:           0,
    address:           0,
    ownerId:           0,
    description:       0,  // text search uses /places?search= instead
  };

  return Place.find({
    status: "active",
    location: {
      $near: {
        $geometry:    { type: "Point", coordinates: [nLng, nLat] },
        $maxDistance: safeRadius,
      },
    },
  }, NEARBY_HIDDEN_FIELDS)
    .populate(POPULATE_PLACE)
    .limit(safeLimit);
};

// Light marker list for map views. Ultra-light projection (~280 B / pin) —
// only the fields a pin or popup actually renders. Caps at 2000 docs so the
// payload + Leaflet render stay predictable for citywide queries.
//
// Dropped vs the list endpoint: translations (popup uses untranslated name,
// which is what users see in the place card anyway), slug / categorySlug /
// categoryIcon / citySlug / sourceLang (display reads *Name fields).
// Saves ~40% on Marrakech (311 markers): 175 KB → ~100 KB.
const getMarkers = async ({ cityId, categoryId, status = "active" } = {}) => {
  const filter = { status };
  if (cityId)     filter.cityId     = cityId;
  if (categoryId) filter.categoryId = categoryId;

  return Place.aggregate([
    { $match: filter },
    { $lookup: {
        from: "cities", localField: "cityId", foreignField: "_id", as: "_city",
        pipeline: [{ $project: { name: 1 } }],
    }},
    { $unwind: { path: "$_city", preserveNullAndEmptyArrays: true } },
    { $lookup: {
        from: "categories", localField: "categoryId", foreignField: "_id", as: "_category",
        pipeline: [{ $project: { name: 1 } }],
    }},
    { $unwind: { path: "$_category", preserveNullAndEmptyArrays: true } },
    { $project: {
        _id:           1,
        name:          1,
        location:      1,
        averageRating: 1,
        reviewCount:   1,
        isFeatured:    1,
        images:        { $slice: ["$images", 1] },
        cityName:      "$_city.name",
        categoryName:  "$_category.name",
    }},
    { $limit: 2000 },
  ]);
};

const getTopPlaces = async (limit = 9) => {
  return Place.find({ status: "active" })
    .populate(POPULATE_PLACE)
    .sort({ isFeatured: -1, reviewCount: -1 })
    .limit(Number(limit));
};

// Returns top-N highest-rated active places per city — used by homepage / explore
// to guarantee city coverage without flooding the client with thousands of rows.
//
// Perf:
//   · In-memory cache (10 min TTL) — first call ~480ms, subsequent <1ms.
//   · $lookup replaces post-aggregation populate — single MongoDB roundtrip.
//   · $project at the end keeps only fields used by frontend cards (slashes ~30% payload).
const getTopPerCity = async ({ perCity = 6, minRating = 0 } = {}) => {
  const n   = Math.min(20, Math.max(1, Number(perCity)));
  const min = Number(minRating) || 0;
  const key = cacheService.buildKey("places:top-per-city", { perCity: n, minRating: min });
  const cached = cacheService.get(key);
  if (cached) return cached;

  const docs = await Place.aggregate([
    { $match: { status: "active", averageRating: { $gte: min } } },
    { $sort: { cityId: 1, averageRating: -1, reviewCount: -1 } },
    { $group: { _id: "$cityId", places: { $push: "$$ROOT" } } },
    { $project: { places: { $slice: ["$places", n] } } },
    { $unwind: "$places" },
    { $replaceRoot: { newRoot: "$places" } },
    // Join city + category in the same pipeline — no second roundtrip
    { $lookup: {
        from: "cities", localField: "cityId", foreignField: "_id", as: "cityId",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
    }},
    { $unwind: { path: "$cityId", preserveNullAndEmptyArrays: true } },
    { $lookup: {
        from: "categories", localField: "categoryId", foreignField: "_id", as: "categoryId",
        pipeline: [{ $project: { name: 1, slug: 1, icon: 1 } }],
    }},
    { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },
    // Keep only the fields a PlaceCard actually renders — trims response size
    { $project: {
        _id: 1, name: 1, slug: 1, images: 1, averageRating: 1, reviewCount: 1,
        isFeatured: 1, entryFee: 1, priceRange: 1, tags: 1, location: 1,
        cityId: 1, categoryId: 1,
        translations: 1, sourceLang: 1,
    }},
  ]);

  cacheService.set(key, docs, cacheService.TTL.PLACES);
  return docs;
};

const getPlaceById = async (id) => {
  if (!id || id === "undefined") throw new ApiError(400, "ID invalide");

  const isObjectId = /^[0-9a-f]{24}$/i.test(id);
  const query      = isObjectId ? Place.findById(id) : Place.findOne({ slug: id });
  const place      = await query
    .populate(POPULATE_PLACE)
    .populate("ownerId", "firstName lastName avatarUrl");

  if (!place) throw new ApiError(404, "Place introuvable");
  return place;
};

// Invalidate hot read caches whenever places change (create/update/archive/feature)
const invalidatePlaceCaches = () => {
  cacheService.delByPrefix("places:top-per-city");
  cacheService.delByPrefix("cities:with-counts");
};

const createPlace = async (data) => {
  const sourceLang = data.sourceLang || "fr";
  const place = await Place.create({ ...data, sourceLang, translationStatus: "pending" });
  invalidatePlaceCaches();

  const fields = {};
  if (place.name)        fields.name        = place.name;
  if (place.description) fields.description = place.description;
  if (place.address)     fields.address     = place.address;

  if (Object.keys(fields).length > 0) {
    translateFields(fields, sourceLang)
      .then((translations) =>
        Place.findByIdAndUpdate(place._id, { translations, translationStatus: "done" })
      )
      .catch(() =>
        Place.findByIdAndUpdate(place._id, { translationStatus: "failed" })
      );
  }

  return place;
};

const updatePlace = async (id, data) => {
  if (Array.isArray(data.images)) {
    const existing = await Place.findById(id).select("images");
    if (existing) {
      const removed = (existing.images ?? []).filter((img) => !data.images.includes(img));
      await deleteUploadedFiles(removed);
    }
  }

  const before = await Place.findById(id).select("status").lean();
  const place  = await Place.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!place) throw new ApiError(404, "Place introuvable");
  invalidatePlaceCaches();

  // Notify favoriting users: status became active, or general content update
  if (data.status === "active" && before?.status !== "active") {
    notifyFavoriters(place._id, place.name, "active").catch(() => {});
  } else if (Object.keys(data).some((k) => ["name", "description", "address", "images", "priceRange"].includes(k))) {
    notifyFavoriters(place._id, place.name, "updated").catch(() => {});
  }

  return place;
};

const archivePlace = async (id) => {
  await Place.findByIdAndUpdate(id, { status: "archived" });
  invalidatePlaceCaches();
};

const permanentDeletePlace = async (id) => {
  const place = await Place.findByIdAndDelete(id);
  if (!place) throw new ApiError(404, "Place introuvable");
  if (place.images?.length) {
    await deleteUploadedFiles(place.images);
  }
};

const toggleFeature = async (id, isFeatured) => {
  const place = await Place.findByIdAndUpdate(id, { isFeatured }, { new: true });
  if (!place) throw new ApiError(404, "Place introuvable");
  invalidatePlaceCaches();
  if (isFeatured) notifyFavoriters(place._id, place.name, "featured").catch(() => {});
  return place.isFeatured;
};

const attachMedia = async ({ placeId, file, caption, userId }) => {
  const type  = file.mimetype.startsWith("video") ? "video" : "image";
  return Media.create({
    url:        `/uploads/${file.filename}`,
    type,
    parentType: "Place",
    parentId:   placeId,
    uploadedBy: userId,
    caption:    caption || "",
  });
};

const claimBusiness = async ({ placeId, userId, payload }) => {
  return PendingRequest.create({
    requestType: "business_verification",
    requestedBy: userId,
    placeId,
    payload,
  });
};

module.exports = {
  getPlaces,
  searchPlaces,
  getNearbyPlaces,
  getTopPlaces,
  getTopPerCity,
  getMarkers,
  getPlaceById,
  createPlace,
  updatePlace,
  archivePlace,
  permanentDeletePlace,
  toggleFeature,
  attachMedia,
  claimBusiness,
};
