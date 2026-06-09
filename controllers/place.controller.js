const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const placeService = require("../services/place.service");

// GET /places
exports.getPlaces = asyncHandler(async (req, res) => {
  const result = await placeService.getPlaces(req.query);
  res.json(result);
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
  const place = await placeService.createPlace(req.body);
  res.status(201).json(place);
});

// PUT /places/:id
exports.updatePlace = asyncHandler(async (req, res) => {
  const place = await placeService.updatePlace(req.params.id, req.body);
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
