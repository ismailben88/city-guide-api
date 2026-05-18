const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const City         = require("../models/City");
const cacheService = require("../services/cache.service");

const PREFIX = "cities";

// GET /cities
exports.getCities = asyncHandler(async (req, res) => {
  const key = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const { isActive } = req.query;
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  const cities = await City.find(filter).sort({ name: 1 });

  cacheService.set(key, cities, cacheService.TTL.CITIES);
  res.json(cities);
});

// GET /cities/:id
exports.getCityById = asyncHandler(async (req, res) => {
  const key = `${PREFIX}:id:${req.params.id}`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const city = await City.findById(req.params.id);
  if (!city) throw new ApiError(404, "Ville introuvable");

  cacheService.set(key, city, cacheService.TTL.CITIES);
  res.json(city);
});

// POST /cities
exports.createCity = asyncHandler(async (req, res) => {
  const city = await City.create(req.body);
  cacheService.delByPrefix(PREFIX);
  res.status(201).json(city);
});

// PUT /cities/:id
exports.updateCity = asyncHandler(async (req, res) => {
  const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!city) throw new ApiError(404, "Ville introuvable");
  cacheService.delByPrefix(PREFIX);
  res.json(city);
});

// DELETE /cities/:id
exports.deleteCity = asyncHandler(async (req, res) => {
  await City.findByIdAndDelete(req.params.id);
  cacheService.delByPrefix(PREFIX);
  res.json({ message: "Ville supprimée" });
});
