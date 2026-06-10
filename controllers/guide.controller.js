const asyncHandler  = require("../utils/asyncHandler");
const ApiError      = require("../utils/ApiError");
const guideService  = require("../services/guide.service");
const cacheService  = require("../services/cache.service");
const GuideProfile  = require("../models/GuideProfile");
const City          = require("../models/City");

const PREFIX = "guides";

// ── Pagination + sort presets (new GET /guideProfiles contract) ───────────
const GUIDE_DEFAULT_LIMIT = 20;
const GUIDE_MAX_LIMIT     = 100;

const GUIDE_SORT_PRESETS = {
  rating:      { averageRating: -1 },
  price_asc:   { pricePerHour:   1 },
  price_desc:  { pricePerHour:  -1 },
  experience:  { experienceYears: -1, averageRating: -1 },
};

const isGuideObjectId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

async function resolveGuideCityId(value) {
  if (!value) return null;
  if (isGuideObjectId(value)) return value;
  const doc = await City.findOne({ slug: String(value).toLowerCase() }).select("_id");
  return doc ? doc._id : undefined;
}

// GET /guideProfiles
//
// Query params (all optional):
//   city       string  city slug ("fes") OR ObjectId  (matches cityIds array)
//   specialty  string  matches guide.specialties[]
//   language   string  matches guide.spokenLanguages[].code
//   priceMin   number  inclusive lower bound on pricePerHour
//   priceMax   number  inclusive upper bound on pricePerHour
//   page       number  default 1
//   limit      number  default 20, max 100
//   sort       string  "rating" | "price_asc" | "price_desc" | "experience"  default "rating"
//
// Backward compatibility: when the request only uses legacy params (eg.
// `userId`, `cityId`, no `city`/`page`/`limit`/`sort` etc.), we delegate to
// `guideService.getGuides()` and return its raw array so existing callers
// stay happy.
//
// New contract response:
//   { data, pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }, guides: data }
exports.getGuides = asyncHandler(async (req, res) => {
  const key = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const { city, specialty, language, priceMin, priceMax, sort, page, limit } = req.query;
  const usesNewContract = [city, specialty, language, priceMin, priceMax, sort, page, limit]
    .some((v) => v !== undefined);

  if (!usesNewContract) {
    // Legacy path — preserves the raw array response for callers that have
    // not migrated yet (eg. useGuides({ userId }), useGuidesByCity).
    const guides = await guideService.getGuides(req.query);
    cacheService.set(key, guides, cacheService.TTL.GUIDES);
    return res.json(guides);
  }

  // ── New paginated path ───────────────────────────────────────────────
  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(GUIDE_MAX_LIMIT, Math.max(1, parseInt(limit, 10) || GUIDE_DEFAULT_LIMIT));

  const resolvedCityId = await resolveGuideCityId(city);
  if (city && resolvedCityId === undefined) {
    throw new ApiError(404, `City "${city}" not found`);
  }

  // Public listings only — same predicate as the service's public branch.
  const filter = {
    isPublished: true,
    isPaused: { $ne: true },
  };
  if (resolvedCityId) filter.cityIds = resolvedCityId;
  if (specialty)      filter.specialties = specialty;
  if (language)       filter["spokenLanguages.code"] = language;
  if (priceMin || priceMax) {
    filter.pricePerHour = {};
    if (priceMin) filter.pricePerHour.$gte = Number(priceMin);
    if (priceMax) filter.pricePerHour.$lte = Number(priceMax);
  }

  const sortSpec = GUIDE_SORT_PRESETS[sort] || GUIDE_SORT_PRESETS.rating;
  const skip = (safePage - 1) * safeLimit;

  const [guides, total] = await Promise.all([
    GuideProfile.find(filter)
      .populate([
        { path: "userId",  select: "firstName lastName avatarUrl email phone whatsapp instagram website role" },
        { path: "cityIds", select: "name slug" },
      ])
      .sort(sortSpec)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    GuideProfile.countDocuments(filter),
  ]);

  // Apply the same `user`/`cities` rename the service does so the frontend
  // sees the consistent shape it expects.
  const data = guides.map((g) => ({
    ...g,
    user:    g.userId,
    cities:  g.cityIds,
    contact: {
      email:     g.userId?.email     || "",
      phone:     g.userId?.phone     || "",
      whatsapp:  g.userId?.whatsapp  || "",
      instagram: g.userId?.instagram || "",
      website:   g.userId?.website   || "",
    },
  }));

  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const result = {
    data,
    pagination: {
      page:        safePage,
      limit:       safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
    guides: data, // legacy field — kept for back-compat
  };

  cacheService.set(key, result, cacheService.TTL.GUIDES);
  res.json(result);
});

// GET /guideProfiles/nearby
exports.getNearbyGuides = asyncHandler(async (req, res) => {
  const guides = await guideService.getNearbyGuides();
  res.json(guides);
});

// GET /guideProfiles/:id
exports.getGuideById = asyncHandler(async (req, res) => {
  const key = `${PREFIX}:id:${req.params.id}`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const guide = await guideService.getGuideById(req.params.id);

  cacheService.set(key, guide, cacheService.TTL.GUIDES);
  res.json(guide);
});

// POST /guideProfiles
exports.createGuideProfile = asyncHandler(async (req, res) => {
  const guide = await guideService.createGuideProfile(req.user._id, req.body);
  cacheService.delByPrefix(PREFIX);
  res.status(201).json(guide);
});

// PUT /guideProfiles/:id
exports.updateGuideProfile = asyncHandler(async (req, res) => {
  const guide = await guideService.updateGuideProfile(req.params.id, req.user._id, req.body);
  cacheService.delByPrefix(PREFIX);
  res.json(guide);
});

// DELETE /guideProfiles/:id
exports.deleteGuideProfile = asyncHandler(async (req, res) => {
  await guideService.deleteGuideProfile(req.params.id);
  cacheService.delByPrefix(PREFIX);
  res.json({ message: "Profil guide supprimé" });
});

// PUT /guideProfiles/:id/availability
exports.updateAvailability = asyncHandler(async (req, res) => {
  const availability = await guideService.updateAvailability(req.params.id, req.body.availability);
  cacheService.delByPrefix(PREFIX);
  res.json({ availability });
});

// POST /guideProfiles/:id/verify-documents
exports.submitVerificationDocuments = asyncHandler(async (req, res) => {
  const result = await guideService.submitVerificationDocuments(
    req.params.id,
    req.user._id,
    req.body,
  );
  cacheService.delByPrefix(PREFIX);
  res.json(result);
});

// PATCH /guideProfiles/:id/pause  (owner only)
exports.pauseGuide = asyncHandler(async (req, res) => {
  await guideService.pauseGuideProfile(req.params.id, req.user._id);
  cacheService.delByPrefix(PREFIX);
  res.json({ isPaused: true });
});

// PATCH /guideProfiles/:id/resume  (owner only)
exports.resumeGuide = asyncHandler(async (req, res) => {
  await guideService.resumeGuideProfile(req.params.id, req.user._id);
  cacheService.delByPrefix(PREFIX);
  res.json({ isPaused: false });
});

// DELETE /guideProfiles/:id/self  (owner only)
exports.selfDeleteGuideProfile = asyncHandler(async (req, res) => {
  await guideService.selfDeleteGuideProfile(req.params.id, req.user._id);
  cacheService.delByPrefix(PREFIX);
  res.json({ message: "Profil guide supprimé" });
});

// PATCH /guideProfiles/:id/certified  (admin only)
exports.toggleCertified = asyncHandler(async (req, res) => {
  const GuideProfile = require("../models/GuideProfile");
  const ApiError     = require("../utils/ApiError");
  const { certified } = req.body;
  if (typeof certified !== "boolean") throw new ApiError(400, "certified must be boolean");
  const guide = await GuideProfile.findByIdAndUpdate(
    req.params.id,
    { certified },
    { new: true }
  );
  if (!guide) throw new ApiError(404, "Guide profile not found");
  cacheService.delByPrefix(PREFIX);
  res.json({ certified: guide.certified });
});

// PATCH /guideProfiles/:id/publish  (admin only)
exports.togglePublish = asyncHandler(async (req, res) => {
  const GuideProfile = require("../models/GuideProfile");
  const ApiError     = require("../utils/ApiError");
  const { isPublished } = req.body;
  if (typeof isPublished !== "boolean") throw new ApiError(400, "isPublished must be boolean");
  const guide = await GuideProfile.findByIdAndUpdate(
    req.params.id,
    { isPublished },
    { new: true }
  );
  if (!guide) throw new ApiError(404, "Guide profile not found");
  cacheService.delByPrefix(PREFIX);
  res.json({ isPublished: guide.isPublished });
});

// PATCH /guideProfiles/:id/verify  (admin only)
exports.verifyGuideProfile = asyncHandler(async (req, res) => {
  const GuideProfile = require("../models/GuideProfile");
  const ApiError     = require("../utils/ApiError");
  const { status } = req.body;
  const VALID = ["unverified", "pending", "verified", "rejected"];
  if (!VALID.includes(status)) throw new ApiError(400, "Invalid verification status");

  const guide = await GuideProfile.findByIdAndUpdate(
    req.params.id,
    { verificationStatus: status, verifiedBy: req.user._id },
    { new: true }
  ).populate("userId", "firstName lastName email avatarUrl");

  if (!guide) throw new ApiError(404, "Guide profile not found");
  cacheService.delByPrefix(PREFIX);
  res.json(guide);
});
