const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const City         = require("../models/City");

// GET /cities
exports.getCities = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  const cities = await City.find(filter).sort({ name: 1 });
  res.json(cities);
});

// GET /cities/:id
exports.getCityById = asyncHandler(async (req, res) => {
  const city = await City.findById(req.params.id);
  if (!city) throw new ApiError(404, "Ville introuvable");
  res.json(city);
});

// POST /cities
exports.createCity = asyncHandler(async (req, res) => {
  const city = await City.create(req.body);
  res.status(201).json(city);
});

// PUT /cities/:id
exports.updateCity = asyncHandler(async (req, res) => {
  const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!city) throw new ApiError(404, "Ville introuvable");
  res.json(city);
});

// DELETE /cities/:id
exports.deleteCity = asyncHandler(async (req, res) => {
  await City.findByIdAndDelete(req.params.id);
  res.json({ message: "Ville supprimée" });
});
