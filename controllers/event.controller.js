const Event = require("../model/Event");

// GET /events
exports.getEvents = async (req, res, next) => {
  try {
    const { cityId, status, isFeatured, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (cityId) filter.cityId = cityId;
    if (status) filter.status = status;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

    const events = await Event.find(filter)
      .populate("cityId", "name slug")
      .populate("organizedBy", "firstName lastName avatarUrl")
      .sort({ "dateRange.from": 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(events);
  } catch (err) { next(err); }
};

// GET /events/nearby
exports.getNearbyEvents = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;
    const events = await Event.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius),
        },
      },
    })
      .populate("cityId", "name slug")
      .limit(20);

    res.json(events);
  } catch (err) { next(err); }
};

// GET /events/:id
exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("cityId", "name slug")
      .populate("organizedBy", "firstName lastName avatarUrl");

    if (!event) return res.status(404).json({ message: "Événement introuvable" });
    res.json(event);
  } catch (err) { next(err); }
};

// POST /events
exports.createEvent = async (req, res, next) => {
  try {
    const event = await Event.create({ ...req.body, organizedBy: req.user._id });
    res.status(201).json(event);
  } catch (err) { next(err); }
};

// PUT /events/:id
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) return res.status(404).json({ message: "Événement introuvable" });
    res.json(event);
  } catch (err) { next(err); }
};

// DELETE /events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { status: "cancelled" });
    res.json({ message: "Événement annulé" });
  } catch (err) { next(err); }
};

// PATCH /events/:id/feature
exports.toggleFeature = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isFeatured: req.body.isFeatured },
      { new: true }
    );
    res.json({ isFeatured: event.isFeatured });
  } catch (err) { next(err); }
};
