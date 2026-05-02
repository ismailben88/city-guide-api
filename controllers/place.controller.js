const Place          = require("../model/Place");
const PendingRequest = require("../model/PendingRequest");

// GET /places
exports.getPlaces = async (req, res, next) => {
  try {
    const { cityId, categoryId, status = "active", isFeatured, page = 1, limit = 20 } = req.query;
    const filter = { status };
    if (cityId) filter.cityId = cityId;
    if (categoryId) filter.categoryId = categoryId;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

    const places = await Place.find(filter)
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ isFeatured: -1, averageRating: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(places);
  } catch (err) { next(err); }
};

// GET /places/search
exports.searchPlaces = async (req, res, next) => {
  try {
    const { q, cityId, categoryId } = req.query;
    const filter = { status: "active" };
    if (cityId) filter.cityId = cityId;
    if (categoryId) filter.categoryId = categoryId;
    if (q) filter.name = { $regex: q, $options: "i" };

    const places = await Place.find(filter)
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .limit(50);

    res.json(places);
  } catch (err) { next(err); }
};

// GET /places/nearby
exports.getNearbyPlaces = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    const places = await Place.find({
      status: "active",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius),
        },
      },
    })
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .limit(20);

    res.json(places);
  } catch (err) { next(err); }
};

// GET /places/top
exports.getTopPlaces = async (req, res, next) => {
  try {
    const { limit = 9 } = req.query;
    const places = await Place.find({ status: "active" })
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ isFeatured: -1, reviewCount: -1 })
      .limit(Number(limit));

    res.json(places);
  } catch (err) { next(err); }
};

// GET /places/:id
exports.getPlaceById = async (req, res, next) => {
  try {
    if (!req.params.id || req.params.id === "undefined") {
      return res.status(400).json({ message: "ID invalide" });
    }
    const place = await Place.findById(req.params.id)
      .populate("cityId", "name slug")
      .populate("categoryId", "name slug icon")
      .populate("ownerId", "firstName lastName avatarUrl");

    if (!place) return res.status(404).json({ message: "Place introuvable" });
    res.json(place);
  } catch (err) { next(err); }
};

// POST /places
exports.createPlace = async (req, res, next) => {
  try {
    const place = await Place.create(req.body);
    res.status(201).json(place);
  } catch (err) { next(err); }
};

// PUT /places/:id
exports.updatePlace = async (req, res, next) => {
  try {
    const place = await Place.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!place) return res.status(404).json({ message: "Place introuvable" });
    res.json(place);
  } catch (err) { next(err); }
};

// DELETE /places/:id
exports.deletePlace = async (req, res, next) => {
  try {
    await Place.findByIdAndUpdate(req.params.id, { status: "archived" });
    res.json({ message: "Place archivée" });
  } catch (err) { next(err); }
};

// PATCH /places/:id/feature
exports.toggleFeature = async (req, res, next) => {
  try {
    const place = await Place.findByIdAndUpdate(
      req.params.id,
      { isFeatured: req.body.isFeatured },
      { new: true }
    );
    res.json({ isFeatured: place.isFeatured });
  } catch (err) { next(err); }
};

// POST /places/:id/media  (multipart/form-data — champ "file")
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

    const Media = require("../model/Media");
    const ext   = req.file.mimetype.startsWith("video") ? "video" : "image";
    const media = await Media.create({
      url:        `/uploads/${req.file.filename}`,
      type:       ext,
      parentType: "Place",
      parentId:   req.params.id,
      uploadedBy: req.user._id,
      caption:    req.body.caption || "",
    });

    res.status(201).json(media);
  } catch (err) { next(err); }
};

// POST /places/:id/claim
exports.claimBusiness = async (req, res, next) => {
  try {
    const request = await PendingRequest.create({
      requestType: "business_verification",
      requestedBy: req.user._id,
      placeId: req.params.id,
      payload: req.body,
    });
    res.status(201).json(request);
  } catch (err) { next(err); }
};
