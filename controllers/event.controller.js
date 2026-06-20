const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Event        = require("../models/Event");
const AdminLog     = require("../models/AdminLog");
const Place        = require("../models/Place");
const Favorite     = require("../models/Favorite");
const City         = require("../models/City");
const { escapeRegex } = require("../utils/regex.utils");
const cacheService = require("../services/cache.service");
const notify       = require("../helpers/notify");
const { reconcileEventStatusesThrottled } = require("../services/eventStatus.service");

const PREFIX = "events";

// ── Pagination + sort presets (new GET /events contract) ───────────────────
const EVENT_DEFAULT_LIMIT = 20;
const EVENT_MAX_LIMIT     = 100;

// Each preset is a ready-to-use Mongo sort spec. `popular` mirrors the
// homepage heuristic: featured events first, then chronological.
const EVENT_SORT_PRESETS = {
  date_asc:  { "dateRange.from": 1 },
  date_desc: { "dateRange.from": -1 },
  popular:   { isFeatured: -1, "dateRange.from": 1 },
};

const isEventObjectId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

/**
 * Resolve a city query value (slug or ObjectId) to an ObjectId.
 * Returns `undefined` when not found so the caller can 404, `null` when no
 * value was supplied (filter is then left untouched).
 */
async function resolveEventCityId(value) {
  if (!value) return null;
  if (isEventObjectId(value)) return value;
  const doc = await City.findOne({ slug: String(value).toLowerCase() }).select("_id");
  return doc ? doc._id : undefined;
}

const POPULATE_EVENT = [
  { path: "cityId",      select: "name slug" },
  { path: "organizedBy", select: "firstName lastName avatarUrl" },
];

// Fields a regular user may set when creating or updating an event.
// `isFeatured`, `organizedBy`, `translationStatus`, etc. are admin-only and
// are stripped here to prevent mass-assignment via crafted `req.body`.
const EVENT_USER_FIELDS = new Set([
  "title", "description", "coverImage", "organizer", "ticketPrice",
  "location", "cityId", "dateRange", "category",
]);

function pickUserFields(body, allowed) {
  const out = {};
  for (const k of Object.keys(body || {})) {
    if (allowed.has(k)) out[k] = body[k];
  }
  return out;
}

// GET /events
//
// Query params (all optional):
//   city      string  city slug ("fes") OR ObjectId
//   category  string  matches the enum on the model
//   status    string  "upcoming" | "ongoing" | "past" | "cancelled"
//   page      number  default 1
//   limit     number  default 20, max 100
//   sort      string  "date_asc" | "date_desc" | "popular"  default "date_asc"
//   search    string  case-insensitive substring on `title`
//
// Backward-compatible passthroughs: cityId, isFeatured, isFree, dateFrom,
// dateTo, sortBy, sortDir.
//
// Response shape (new contract):
//   { data, pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }
// Also retains legacy fields (`events`, `total`, `hasNext`, `hasPrev`).
exports.getEvents = asyncHandler(async (req, res) => {
  // Keep stored statuses fresh so `?status=` filtering is accurate (throttled).
  reconcileEventStatusesThrottled();

  const key    = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const {
    city, category, status, isFeatured, search, isFree, dateFrom, dateTo,
    sort, sortBy = "dateRange.from", sortDir = "asc",
    page, limit,
    cityId: rawCityId,
    ...rest
  } = req.query;

  // Sanitise pagination — clamp to safe range, default to spec values.
  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(EVENT_MAX_LIMIT, Math.max(1, parseInt(limit, 10) || EVENT_DEFAULT_LIMIT));

  // Resolve city slug → ObjectId if needed. A `city` slug that doesn't
  // match anything is a hard 404 (per spec); a missing param is fine.
  const resolvedCityId = await resolveEventCityId(city);
  if (city && resolvedCityId === undefined) {
    throw new ApiError(404, `City "${city}" not found`);
  }

  // Build filter — same logic as before, plus the new `category` field.
  const filter = {};
  const effectiveCityId = resolvedCityId ?? rawCityId;
  if (effectiveCityId)          filter.cityId     = effectiveCityId;
  if (category)                 filter.category   = category;
  if (status)                   filter.status     = status;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
  if (isFree === "true")        filter.ticketPrice = 0;
  if (search)                   filter.title      = { $regex: escapeRegex(search), $options: "i" };
  if (dateFrom || dateTo) {
    filter["dateRange.from"] = {};
    if (dateFrom) filter["dateRange.from"].$gte = new Date(dateFrom);
    if (dateTo)   filter["dateRange.from"].$lte = new Date(dateTo);
  }

  // Pick the sort spec: preset wins over legacy sortBy/sortDir if present.
  let sortSpec;
  if (sort && EVENT_SORT_PRESETS[sort]) {
    sortSpec = EVENT_SORT_PRESETS[sort];
  } else {
    const sortField = ["dateRange.from", "createdAt", "title"].includes(sortBy) ? sortBy : "dateRange.from";
    const sortOrder = sortDir === "desc" ? -1 : 1;
    sortSpec = { [sortField]: sortOrder };
  }

  const skip = (safePage - 1) * safeLimit;
  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate(POPULATE_EVENT)
      .sort(sortSpec)
      .skip(skip)
      .limit(safeLimit),
    Event.countDocuments(filter),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const result = {
    data: events,
    pagination: {
      page:        safePage,
      limit:       safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
    // ── Legacy fields ─────────────────────────────────────────────────────
    events,
    total,
    page:  safePage,
    limit: safeLimit,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
  cacheService.set(key, result, cacheService.TTL.EVENTS);
  res.json(result);
});

// GET /events/nearby
exports.getNearbyEvents = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10000 } = req.query;
  const events = await Event.find({
    location: {
      $near: {
        $geometry:    { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius),
      },
    },
  })
    .populate("cityId", "name slug")
    .limit(20);

  res.json(events);
});

// GET /events/:id
exports.getEventById = asyncHandler(async (req, res) => {
  const key    = `${PREFIX}:id:${req.params.id}`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const event = await Event.findById(req.params.id).populate(POPULATE_EVENT);
  if (!event) throw new ApiError(404, "Événement introuvable");

  cacheService.set(key, event, cacheService.TTL.EVENTS);
  res.json(event);
});

// POST /events
exports.createEvent = asyncHandler(async (req, res) => {
  const safe = pickUserFields(req.body, EVENT_USER_FIELDS);
  // Admins may also pass isFeatured & status; preserve those for admin callers.
  if (req.user?.role === "admin") {
    if (req.body.isFeatured !== undefined) safe.isFeatured = req.body.isFeatured;
    if (req.body.status     !== undefined) safe.status     = req.body.status;
  }
  const event = await Event.create({ ...safe, organizedBy: req.user._id });
  cacheService.delByPrefix(PREFIX);
  res.status(201).json(event);

  // Fire-and-forget: notify users who have favorited places in this event's city
  if (event.cityId) {
    notifyUsersInCity(event.cityId, event.title || event.name, event._id).catch(() => {});
  }
});

async function notifyUsersInCity(cityId, eventTitle, eventId) {
  const city = await City.findById(cityId).select("name").lean();
  if (!city) return;

  // Find places in this city, then users who favorited any of them
  const places = await Place.find({ cityId }).select("_id").lean();
  if (!places.length) return;
  const placeIds = places.map((p) => p._id);

  const favs = await Favorite.find({ targetType: "Place", targetId: { $in: placeIds } })
    .select("userId").lean();
  if (!favs.length) return;

  const userIds = [...new Set(favs.map((f) => f.userId.toString()))];
  await Promise.allSettled(
    userIds.map((uid) => notify.newEventInCity(uid, eventTitle, city.name, eventId))
  );
}

// PUT /events/:id
exports.updateEvent = asyncHandler(async (req, res) => {
  const safe = pickUserFields(req.body, EVENT_USER_FIELDS);
  if (req.user?.role === "admin") {
    if (req.body.isFeatured !== undefined) safe.isFeatured = req.body.isFeatured;
    if (req.body.status     !== undefined) safe.status     = req.body.status;
  }
  const event = await Event.findByIdAndUpdate(req.params.id, safe, {
    new: true, runValidators: true,
  });
  if (!event) throw new ApiError(404, "Événement introuvable");
  cacheService.delByPrefix(PREFIX);
  res.json(event);
});

// DELETE /events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select("title status");
  if (!event) throw new ApiError(404, "Événement introuvable");
  if (event.status === "cancelled") throw new ApiError(400, "Événement déjà annulé");

  await Event.findByIdAndUpdate(req.params.id, { status: "cancelled" });
  cacheService.delByPrefix(PREFIX);

  await AdminLog.create({
    adminId: req.user._id,
    action: "cancel_event",
    targetType: "Event",
    targetId: event._id,
    metadata: { title: event.title },
  });

  res.json({ message: "Événement annulé" });
});

// PATCH /events/:id/cover  (multipart — field "file")
exports.uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file provided");
  const url   = `/uploads/${req.file.filename}`;
  const event = await Event.findByIdAndUpdate(req.params.id, { coverImage: url }, { new: true });
  if (!event) throw new ApiError(404, "Événement introuvable");
  cacheService.delByPrefix(PREFIX);
  res.json({ url });
});

// PATCH /events/:id/feature
exports.toggleFeature = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { isFeatured: req.body.isFeatured },
    { new: true }
  );
  if (!event) throw new ApiError(404, "Événement introuvable");
  cacheService.delByPrefix(PREFIX);

  await AdminLog.create({
    adminId: req.user._id,
    action: req.body.isFeatured ? "feature_event" : "unfeature_event",
    targetType: "Event",
    targetId: event._id,
    metadata: { title: event.title },
  });

  res.json({ isFeatured: event.isFeatured });
});
