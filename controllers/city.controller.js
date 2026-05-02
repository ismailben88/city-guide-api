const City = require("../model/City");

// GET /cities
exports.getCities = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const cities = await City.find(filter).sort({ name: 1 });
    res.json(cities);
  } catch (err) { next(err); }
};

// GET /cities/:id
exports.getCityById = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).json({ message: "Ville introuvable" });
    res.json(city);
  } catch (err) { next(err); }
};

// POST /cities
exports.createCity = async (req, res, next) => {
  try {
    const city = await City.create(req.body);
    res.status(201).json(city);
  } catch (err) { next(err); }
};

// PUT /cities/:id
exports.updateCity = async (req, res, next) => {
  try {
    const city = await City.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!city) return res.status(404).json({ message: "Ville introuvable" });
    res.json(city);
  } catch (err) { next(err); }
};

// DELETE /cities/:id
exports.deleteCity = async (req, res, next) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ message: "Ville supprimée" });
  } catch (err) { next(err); }
};
