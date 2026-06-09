const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const placeService = require("../services/place.service");
const City         = require("../models/City");
const Category     = require("../models/Category");

// ── Pagination + sort helpers ────────────────────────────────────────────────
const PLACE_DEFAULT_LIMIT = 24;
const PLACE_MAX_LIMIT     = 100;

// Sort presets → service sortBy/sortDir mapping. The service performs the
// actual Mongo sort, so each preset is just two of its existing levers.
const PLACE_SORT_PRESETS = {
  popular: { sortBy: "reviewCount",   sortDir: "desc" },
  rating:  { sortBy: "averageRating", sortDir: "desc" },
  newest:  { sortBy: "createdAt",     sortDir: "desc" },
};

const isObjectId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

/**
 * Resolve a city query value (slug or 24-char hex ObjectId) to an ObjectId.
 * Returns:
 *   - the value as-is if it's already an ObjectId
 *   - the resolved ObjectId when a slug matches
 *   - `undefined` when nothing matches (so the caller can 404)
 *   - `null` when no `value` was provided
 */
async function resolveCityId(value) {
  if (!value) return null;
  if (isObjectId(value)) return value;
  const doc = await City.findOne({ slug: String(value).toLowerCase() }).select("_id");
  return doc ? doc._id : undefined;
}

/**
 * Resolve a category query value (slug, name, or ObjectId) to an ObjectId.
 * Same return contract as `resolveCityId`.
 */
async function resolveCategoryId(value) {
  if (!value) return null;
  if (isObjectId(value)) return value;
  const doc = await Category.findOne({
    $or: [{ slug: String(value).toLowerCase() }, { name: value }],
  }).select("_id");
  return doc ? doc._id : undefined;
}

// Fields a regular user (e.g. a business owner) is allowed to set.
// `ownerId`, `isVerifiedBusiness`, `isFeatured`, `status`, `rejectionReason`,
// `averageRating`, `reviewCount`, `translations`, `translationStatus` are
// admin-only or system-managed and are stripped to prevent mass-assignment.
const PLACE_USER_FIELDS = new Set([
  "name", "slug", "categoryId", "cityId", "location",
  "description", "address", "images",
  "phone", "website", "openingHours", "tags",
  "priceRange", "entryFee", "sourceLang",
]);

const PLACE_ADMIN_ONLY = new Set([
  "isVerifiedBusiness", "isFeatured", "status", "rejectionReason", "ownerId",
]);

function pickAllowed(body, allowed, adminAllowed, isAdmin) {
  const out = {};
  for (const k of Object.keys(body || {})) {
    if (allowed.has(k)) out[k] = body[k];
    else if (isAdmin && adminAllowed.has(k)) out[k] = body[k];
  }
  return out;
}

// GET /places
//
// Query params (all optional):
//   city      string  city slug ("fes") OR ObjectId
//   category  string  category slug/name OR ObjectId
//   page      number  default 1
//   limit     number  default 24, max 100
//   sort      string  "popular" | "rating" | "newest"  default "popular"
//   search    string  case-insensitive substring on `name`
//
// Backward-compatible passthroughs (already in use by other callers):
//   cityId, categoryId, status, isFeatured, isVerifiedBusiness, sortBy, sortDir
//
// Response shape (new contract):
//   { data: Place[], pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }
// Also retains the legacy `places` / `total` fields so existing services keep working.
exports.getPlaces = asyncHandler(async (req, res) => {
  const { city, category, page, limit, sort, search, ...rest } = req.query;

  // Sanitise pagination — clamp to safe range, default to spec values.
  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(PLACE_MAX_LIMIT, Math.max(1, parseInt(limit, 10) || PLACE_DEFAULT_LIMIT));

  // Resolve slug-style identifiers to ObjectIds before delegating.
  const resolvedCityId     = await resolveCityId(city);
  const resolvedCategoryId = await resolveCategoryId(category);

  // 404 if an explicit `city` slug doesn't match anything — the spec calls for
  // a clear error rather than silently returning every other city's places.
  if (city && resolvedCityId === undefined) {
    throw new ApiError(404, `City "${city}" not found`);
  }

  // A category miss is non-fatal: we return an empty page rather than 404,
  // since the user might just have mistyped a filter.
  if (category && resolvedCategoryId === undefined) {
    return res.json({
      data: [],
      places: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      total: 0,
    });
  }

  // Map the high-level `sort` preset to the service's existing sort levers.
  // Falls back to whatever the caller passed via `sortBy/sortDir` (legacy).
  const preset = PLACE_SORT_PRESETS[sort] || PLACE_SORT_PRESETS.popular;

  const serviceQuery = {
    ...rest,
    cityId:     resolvedCityId     ?? rest.cityId,
    categoryId: resolvedCategoryId ?? rest.categoryId,
    sortBy:     rest.sortBy || preset.sortBy,
    sortDir:    rest.sortDir || preset.sortDir,
    page:       safePage,
    limit:      safeLimit,
    search,
  };

  const result = await placeService.getPlaces(serviceQuery);
  const total      = result.total ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  res.json({
    data: result.places,
    pagination: {
      page:        safePage,
      limit:       safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
    // ── Legacy fields ─────────────────────────────────────────────────────
    // Retained so existing frontend services that look for `places`/`total`
    // keep working until they're migrated.
    places: result.places,
    total,
    page:   safePage,
    limit:  safeLimit,
  });
});

// GET /places/markers
//
// Ultra-light listing used by the map view: ~250 B per pin. Skips pagination
// because the map wants every point in scope at once. Hard-capped at 2000.
//
// Query params: same city/category resolution as /places, plus status.
//
// See `placeService.getMarkers` for the full projection.
exports.getPlaceMarkers = asyncHandler(async (req, res) => {
  const { city, category, status = "active" } = req.query;

  const resolvedCityId     = await resolveCityId(city);
  const resolvedCategoryId = await resolveCategoryId(category);

  if (city && resolvedCityId === undefined) {
    throw new ApiError(404, `City "${city}" not found`);
  }
  if (category && resolvedCategoryId === undefined) {
    return res.json([]);
  }

  const markers = await placeService.getMarkers({
    cityId:     resolvedCityId     ?? undefined,
    categoryId: resolvedCategoryId ?? undefined,
    status,
  });
  res.json(markers);
});

// GET /places/search
exports.searchPlaces = asyncHandler(async (req, res) => {
  const places = await placeService.searchPlaces(req.query);
  res.json(places);
});

// GET /places/nearby
exports.getNearbyPlaces = asyncHandler(async (req, res) => {
  const places = await placeService.getNearbyPlaces(req.query);
  res.json(places);
});

// GET /places/top
exports.getTopPlaces = asyncHandler(async (req, res) => {
  const places = await placeService.getTopPlaces(req.query.limit);
  res.json(places);
});

// GET /places/top-per-city?perCity=6&minRating=4
exports.getTopPerCity = asyncHandler(async (req, res) => {
  const places = await placeService.getTopPerCity({
    perCity:   req.query.perCity,
    minRating: req.query.minRating,
  });
  res.json(places);
});

// GET /places/:id
exports.getPlaceById = asyncHandler(async (req, res) => {
  const place = await placeService.getPlaceById(req.params.id);
  res.json(place);
});

// POST /places
exports.createPlace = asyncHandler(async (req, res) => {
  const safe = pickAllowed(req.body, PLACE_USER_FIELDS, PLACE_ADMIN_ONLY, req.user?.role === "admin");
  // Stamp the creator as ownerId when a non-admin business user posts.
  if (req.user && req.user.role !== "admin" && !safe.ownerId) {
    safe.ownerId = req.user._id;
  }
  const place = await placeService.createPlace(safe);
  res.status(201).json(place);
});

// PUT /places/:id
exports.updatePlace = asyncHandler(async (req, res) => {
  const safe = pickAllowed(req.body, PLACE_USER_FIELDS, PLACE_ADMIN_ONLY, req.user?.role === "admin");
  const place = await placeService.updatePlace(req.params.id, safe);
  res.json(place);
});

// DELETE /places/:id
exports.deletePlace = asyncHandler(async (req, res) => {
  await placeService.archivePlace(req.params.id);
  res.json({ message: "Place archivée" });
});

// DELETE /places/:id/permanent  (admin only)
exports.permanentDeletePlace = asyncHandler(async (req, res) => {
  await placeService.permanentDeletePlace(req.params.id);
  res.json({ message: "Place définitivement supprimée" });
});

// PATCH /places/:id/feature
exports.toggleFeature = asyncHandler(async (req, res) => {
  const isFeatured = await placeService.toggleFeature(req.params.id, req.body.isFeatured);
  res.json({ isFeatured });
});

// POST /places/:id/media  (multipart/form-data — champ "file")
exports.uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Aucun fichier reçu");
  const media = await placeService.attachMedia({
    placeId: req.params.id,
    file:    req.file,
    caption: req.body.caption,
    userId:  req.user._id,
  });
  res.status(201).json(media);
});

// POST /places/:id/claim
exports.claimBusiness = asyncHandler(async (req, res) => {
  const request = await placeService.claimBusiness({
    placeId: req.params.id,
    userId:  req.user._id,
    payload: req.body,
  });
  res.status(201).json(request);
});
