const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const City         = require("../models/City");
const Place        = require("../models/Place");
const Event        = require("../models/Event");
const GuideProfile = require("../models/GuideProfile");
const cacheService = require("../services/cache.service");

const PREFIX = "cities";

// GET /cities
exports.getCities = asyncHandler(async (req, res) => {
  const key = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const { isActive } = req.query;
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  const cities = await City.find(filter).sort({ name: 1 });

  cacheService.set(key, cities, cacheService.TTL.CITIES);
  res.json(cities);
});

// GET /cities/with-counts — cities + active-place counts, sorted by count desc
// Used by the explore strip to surface major cities first.
exports.getCitiesWithCounts = asyncHandler(async (req, res) => {
  const key = `${PREFIX}:with-counts`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const cities = await City.find({}).lean();
  const counts = await Place.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$cityId", count: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  const out = cities
    .map((c) => ({ ...c, placesCount: byId[String(c._id)] || 0 }))
    .filter((c) => c.placesCount > 0)
    .sort((a, b) => b.placesCount - a.placesCount);

  cacheService.set(key, out, cacheService.TTL.CITIES);
  res.json(out);
});

// GET /cities/:id
exports.getCityById = asyncHandler(async (req, res) => {
  const key = `${PREFIX}:id:${req.params.id}`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const city = await City.findById(req.params.id);
  if (!city) throw new ApiError(404, "Ville introuvable");

  cacheService.set(key, city, cacheService.TTL.CITIES);
  res.json(city);
});

// POST /cities
exports.createCity = asyncHandler(async (req, res) => {
  const city = await City.create(req.body);
  cacheService.delByPrefix(PREFIX);
  res.status(201).json(city);
});

// PUT /cities/:id
exports.updateCity = asyncHandler(async (req, res) => {
  const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!city) throw new ApiError(404, "Ville introuvable");
  cacheService.delByPrefix(PREFIX);
  res.json(city);
});

// DELETE /cities/:id
exports.deleteCity = asyncHandler(async (req, res) => {
  await City.findByIdAndDelete(req.params.id);
  cacheService.delByPrefix(PREFIX);
  res.json({ message: "Ville supprimée" });
});

// ─── Stats endpoint ─────────────────────────────────────────────────────────
//
// GET /cities/:slug/stats
//
// Counts every public-facing entity attached to a city in one round-trip.
// Used by CityDetailPage to show real per-city totals + per-category
// breakdown in the filter tabs — instead of inferring from the (now-paginated)
// data array.
//
// Response:
//   {
//     placesCount: number,
//     eventsCount: number,
//     guidesCount: number,
//     byCategory:  Array<{ _id: ObjectId, count: number }>
//   }
exports.getCityStats = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const key  = `${PREFIX}:stats:${slug}`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  // Accept either a slug (preferred) or a raw ObjectId so the route also
  // works when called with /:id by mistake.
  const isObjectId = /^[a-f0-9]{24}$/i.test(slug);
  const projection = "_id name slug location coverImage";
  const city = isObjectId
    ? await City.findById(slug).select(projection)
    : await City.findOne({ slug }).select(projection);
  if (!city) throw new ApiError(404, `City "${slug}" not found`);

  const cityId = city._id;
  const [placesCount, eventsCount, guidesCount, byCategory] = await Promise.all([
    Place.countDocuments({ cityId, status: "active" }),
    Event.countDocuments({ cityId }),
    GuideProfile.countDocuments({
      cityIds: cityId,
      $or: [{ isPublished: true }, { verificationStatus: "verified" }, { certified: true }],
      isPaused: { $ne: true },
    }),
    Place.aggregate([
      { $match: { cityId, status: "active" } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const out = {
    city: {
      _id:         city._id,
      name:        city.name,
      slug:        city.slug,
      location:    city.location,
      coverImage:  city.coverImage,
    },
    placesCount,
    eventsCount,
    guidesCount,
    byCategory,
  };

  // 10-min TTL — counts move slowly; longer than the page-level cache.
  cacheService.set(key, out, 600);
  res.json(out);
});
