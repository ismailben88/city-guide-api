const router        = require("express").Router();
const Place         = require("../model/Place");
const PendingRequest= require("../model/PendingRequest");
const City          = require("../model/City");
const Category      = require("../model/Category");
const { protect }   = require("../middleware/auth");

// Normalize a Place document to the shape BusinessSettings.jsx expects
function toFrontend(doc) {
  const b = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...b,
    city:     b.cityId?.name     ?? "",
    category: b.categoryId?.name ?? "",
    status:   b.isVerifiedBusiness ? "live" : "pending",
  };
}

// GET /businesses
// - ?ownerId=<id>  → all listings by owner regardless of verification
// - (no param)     → public list of verified+active places
router.get("/", async (req, res, next) => {
  try {
    const filter = req.query.ownerId
      ? { ownerId: req.query.ownerId }
      : { isVerifiedBusiness: true, status: "active" };

    const businesses = await Place.find(filter)
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ createdAt: -1 });

    res.json(businesses.map(toFrontend));
  } catch (err) { next(err); }
});

// GET /businesses/:id
router.get("/:id", async (req, res, next) => {
  try {
    const business = await Place.findOne({ _id: req.params.id, isVerifiedBusiness: true })
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon");

    if (!business) return res.status(404).json({ message: "Business introuvable" });
    res.json(toFrontend(business));
  } catch (err) { next(err); }
});

// POST /businesses — submit a new listing for review
router.post("/", protect, async (req, res, next) => {
  try {
    const { name, category, city, description, location, photos } = req.body;

    if (!name || !category || !city) {
      return res.status(400).json({ message: "name, category et city sont obligatoires" });
    }

    const cityDoc = await City.findOne({ name: { $regex: new RegExp(`^${city.trim()}$`, "i") } });
    if (!cityDoc) return res.status(400).json({ message: `Ville introuvable : ${city}` });

    // Find existing category (case-insensitive) or create it on the fly
    const catSlug = category.trim()
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const catDoc = await Category.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${category.trim()}$`, "i") } },
      { $setOnInsert: { name: category.trim(), slug: catSlug, status: "active" } },
      { upsert: true, new: true }
    );

    // Generate a unique slug from the name
    const baseSlug = name
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Date.now()}`;

    const business = await Place.create({
      name,
      slug,
      categoryId:        catDoc._id,
      cityId:            cityDoc._id,
      description:       description || "",
      address:           location    || "",
      images:            photos      || [],
      ownerId:           req.user._id,
      isVerifiedBusiness: false,
      status:            "pending",
    });

    // Auto-create a pending review request
    await PendingRequest.create({
      requestType: "business_verification",
      requestedBy: req.user._id,
      placeId:     business._id,
      payload:     { name, category, city, description, location },
    });

    const populated = await Place.findById(business._id)
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon");

    res.status(201).json(toFrontend(populated));
  } catch (err) { next(err); }
});

// PUT /businesses/:id — update name / description / address
router.put("/:id", protect, async (req, res, next) => {
  try {
    const allowed = (({ name, description, address, priceRange }) =>
      ({ name, description, address, priceRange }))(req.body);

    const business = await Place.findByIdAndUpdate(req.params.id, allowed, { new: true })
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon");

    if (!business) return res.status(404).json({ message: "Business introuvable" });
    res.json(toFrontend(business));
  } catch (err) { next(err); }
});

// DELETE /businesses/:id — soft-delete via status
router.delete("/:id", protect, async (req, res, next) => {
  try {
    await Place.findByIdAndUpdate(req.params.id, { status: "archived" });
    res.json({ message: "Business archivé" });
  } catch (err) { next(err); }
});

module.exports = router;
