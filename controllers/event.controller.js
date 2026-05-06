const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Event        = require("../models/Event");
const { getPagination } = require("../utils/pagination.utils");

const POPULATE_EVENT = [
  { path: "cityId",      select: "name slug" },
  { path: "organizedBy", select: "firstName lastName avatarUrl" },
];

// GET /events
exports.getEvents = asyncHandler(async (req, res) => {
  const { cityId, status, isFeatured, ...rest } = req.query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (cityId)                   filter.cityId     = cityId;
  if (status)                   filter.status     = status;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

  const events = await Event.find(filter)
    .populate(POPULATE_EVENT)
    .sort({ "dateRange.from": 1 })
    .skip(skip)
    .limit(limit);

  res.json(events);
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
  const event = await Event.findById(req.params.id).populate(POPULATE_EVENT);
  if (!event) throw new ApiError(404, "Événement introuvable");
  res.json(event);
});

// POST /events
exports.createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({ ...req.body, organizedBy: req.user._id });
  res.status(201).json(event);
});

// PUT /events/:id
exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!event) throw new ApiError(404, "Événement introuvable");
  res.json(event);
});

// DELETE /events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, { status: "cancelled" });
  res.json({ message: "Événement annulé" });
});

// PATCH /events/:id/feature
exports.toggleFeature = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { isFeatured: req.body.isFeatured },
    { new: true }
  );
  if (!event) throw new ApiError(404, "Événement introuvable");
  res.json({ isFeatured: event.isFeatured });
});
