const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Category     = require("../models/Category");
const cacheService = require("../services/cache.service");

const PREFIX = "categories";

// GET /categories
exports.getCategories = asyncHandler(async (req, res) => {
  const key = cacheService.buildKey(PREFIX, req.query);
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const categories = await Category.find({ status: "active" }).sort({ name: 1 });

  cacheService.set(key, categories, cacheService.TTL.CATEGORIES);
  res.json(categories);
});

// GET /categories/:id
exports.getCategoryById = asyncHandler(async (req, res) => {
  const key = `${PREFIX}:id:${req.params.id}`;
  const cached = cacheService.get(key);
  if (cached) return res.json(cached);

  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Catégorie introuvable");

  cacheService.set(key, category, cacheService.TTL.CATEGORIES);
  res.json(category);
});

// POST /categories
exports.createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  cacheService.delByPrefix(PREFIX);
  res.status(201).json(category);
});

// PUT /categories/:id
exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, "Catégorie introuvable");
  cacheService.delByPrefix(PREFIX);
  res.json(category);
});

// DELETE /categories/:id
exports.deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { status: "inactive" });
  cacheService.delByPrefix(PREFIX);
  res.json({ message: "Catégorie désactivée" });
});
