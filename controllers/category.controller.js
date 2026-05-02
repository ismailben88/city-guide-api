const Category = require("../model/Category");

// GET /categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ status: "active" }).sort({ name: 1 });
    res.json(categories);
  } catch (err) { next(err); }
};

// GET /categories/:id
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Catégorie introuvable" });
    res.json(category);
  } catch (err) { next(err); }
};

// POST /categories
exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) { next(err); }
};

// PUT /categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) return res.status(404).json({ message: "Catégorie introuvable" });
    res.json(category);
  } catch (err) { next(err); }
};

// DELETE /categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { status: "inactive" });
    res.json({ message: "Catégorie désactivée" });
  } catch (err) { next(err); }
};
