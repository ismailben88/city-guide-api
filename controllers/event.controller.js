const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Event        = require("../models/Event");
const AdminLog     = require("../models/AdminLog");
const Place        = require("../models/Place");
const Favorite     = require("../models/Favorite");
const City         = require("../models/City");
const { getPagination, buildPaginationMeta } = require("../utils/pagination.utils");
const cacheService = require("../services/cache.service");
const notify       = require("../helpers/notify");

const PREFIX = "events";

const POPULATE_EVENT = [
  { path: "cityId",      select: "name slug" },
  { path: "organizedBy", select: "firstName lastName avatarUrl" },
];

// GET /events
exports.getEvents = asyncHandler(async (req, res) => {
  const key    = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const { cityId, status, isFeatured, search, isFree, dateFrom, dateTo, sortBy = "dateRange.from", sortDir = "asc", ...rest } = req.query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (cityId)                   filter.cityId     = cityId;
  if (status)                   filter.status     = status;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";
  if (isFree === "true")        filter.ticketPrice = 0;
  if (search)                   filter.title      = { $regex: search, $options: "i" };
  if (dateFrom || dateTo) {
    filter["dateRange.from"] = {};
    if (dateFrom) filter["dateRange.from"].$gte = new Date(dateFrom);
    if (dateTo)   filter["dateRange.from"].$lte = new Date(dateTo);
  }

  const sortField = ["dateRange.from", "createdAt", "title"].includes(sortBy) ? sortBy : "dateRange.from";
  const sortOrder = sortDir === "desc" ? -1 : 1;

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate(POPULATE_EVENT)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Event.countDocuments(filter),
  ]);

  const result = { events, ...buildPaginationMeta(total, page, limit) };
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
  const event = await Event.create({ ...req.body, organizedBy: req.user._id });
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
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
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
