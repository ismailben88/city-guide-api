const asyncHandler  = require("../utils/asyncHandler");
const guideService  = require("../services/guide.service");

// GET /guideProfiles
exports.getGuides = asyncHandler(async (req, res) => {
  const guides = await guideService.getGuides(req.query);
  res.json(guides);
});

// GET /guideProfiles/nearby
exports.getNearbyGuides = asyncHandler(async (req, res) => {
  const guides = await guideService.getNearbyGuides();
  res.json(guides);
});

// GET /guideProfiles/:id
exports.getGuideById = asyncHandler(async (req, res) => {
  const guide = await guideService.getGuideById(req.params.id);
  res.json(guide);
});

// POST /guideProfiles
exports.createGuideProfile = asyncHandler(async (req, res) => {
  const guide = await guideService.createGuideProfile(req.user._id, req.body);
  res.status(201).json(guide);
});

// PUT /guideProfiles/:id
exports.updateGuideProfile = asyncHandler(async (req, res) => {
  const guide = await guideService.updateGuideProfile(req.params.id, req.body);
  res.json(guide);
});

// DELETE /guideProfiles/:id
exports.deleteGuideProfile = asyncHandler(async (req, res) => {
  await guideService.deleteGuideProfile(req.params.id);
  res.json({ message: "Profil guide supprimé" });
});

// PUT /guideProfiles/:id/availability
exports.updateAvailability = asyncHandler(async (req, res) => {
  const availability = await guideService.updateAvailability(req.params.id, req.body.availability);
  res.json({ availability });
});
