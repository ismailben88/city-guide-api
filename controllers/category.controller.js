const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Category     = require("../models/Category");

// GET /categories
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: "active" }).sort({ name: 1 });
  res.json(categories);
});

// GET /categories/:id
exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Catégorie introuvable");
  res.json(category);
});

// POST /categories
exports.createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

// PUT /categories/:id
exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, "Catégorie introuvable");
  res.json(category);
});

// DELETE /categories/:id
exports.deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { status: "inactive" });
  res.json({ message: "Catégorie désactivée" });
});
