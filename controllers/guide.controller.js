const asyncHandler  = require("../utils/asyncHandler");
const guideService  = require("../services/guide.service");
const cacheService  = require("../services/cache.service");

const PREFIX = "guides";

// GET /guideProfiles
exports.getGuides = asyncHandler(async (req, res) => {
  const key = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const guides = await guideService.getGuides(req.query);

  cacheService.set(key, guides, cacheService.TTL.GUIDES);
  res.json(guides);
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
  const guide = await guideService.updateGuideProfile(req.params.id, req.body);
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
