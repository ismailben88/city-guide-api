const router        = require("express").Router();
const Place         = require("../models/Place");
const PendingRequest= require("../models/PendingRequest");
const City          = require("../models/City");
const Category      = require("../models/Category");
const User          = require("../models/User");
const { protect }   = require("../middlewares/auth.middleware");
const upload        = require("../middlewares/upload.middleware");
const notify        = require("../helpers/notify");

// Notify every admin user — fire-and-forget
async function notifyAdmins(fn) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    admins.forEach((a) => fn(a._id).catch(() => {}));
  } catch { /* non-critical */ }
}

// POST /businesses/:id/photos — upload photos for a business listing
router.post("/:id/photos", protect, upload.array("photos", 6), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files received" });
    const origin = `${req.protocol}://${req.get("host")}`;
    const urls = req.files.map((f) => `${origin}/uploads/${f.filename}`);
    const business = await Place.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: urls } } },
      { new: true }
    );
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json({ images: urls });
  } catch (err) { next(err); }
});

// Normalize a Place document to the shape BusinessSettings.jsx expects
function toFrontend(doc) {
  const b = doc.toObject ? doc.toObject() : { ...doc };
  const frontendStatus = b.isVerifiedBusiness ? "live"
    : b.status === "rejected"                 ? "rejected"
    : "pending";
  return {
    ...b,
    city:            b.cityId?.name     ?? "",
    category:        b.categoryId?.name ?? "",
    thumbnail:       b.images?.[0]      ?? null,
    status:          frontendStatus,
    rejectionReason: b.rejectionReason  || "",
  };
}

// GET /businesses
// - ?mine=true  (authenticated) → caller's own listings regardless of verification
// - (no param)  → public list of verified+active places
router.get("/", async (req, res, next) => {
  try {
    let filter;
    if (req.query.mine || req.query.ownerId) {
      // Require authentication for private listing view
      await new Promise((resolve, reject) => protect(req, res, (err) => err ? reject(err) : resolve()));
      filter = { ownerId: req.user._id, status: { $ne: "archived" } };
    } else {
      filter = { isVerifiedBusiness: true, status: "active" };
    }

    const businesses = await Place.find(filter)
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon")
      .sort({ createdAt: -1 });

    res.json(businesses.map(toFrontend));
  } catch (err) { next(err); }
});

// GET /businesses/:id — public for verified; authenticated owner can view own pending/rejected
router.get("/:id", async (req, res, next) => {
  try {
    const business = await Place.findById(req.params.id)
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon");

    if (!business) return res.status(404).json({ message: "Business introuvable" });

    // Non-verified: only the owner may view it
    if (!business.isVerifiedBusiness) {
      await new Promise((resolve, reject) => protect(req, res, (err) => err ? reject(err) : resolve()));
      if (business.ownerId?.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Accès refusé" });
    }

    res.json(toFrontend(business));
  } catch (err) { next(err); }
});

// POST /businesses — submit a new listing for review
router.post("/", protect, async (req, res, next) => {
  try {
    const { name, category, city, description, location, priceRange, photos, sourceLang, lat, lng } = req.body;

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

    const parsedLat = lat != null ? parseFloat(lat) : NaN;
    const parsedLng = lng != null ? parseFloat(lng) : NaN;

    const business = await Place.create({
      name,
      slug,
      categoryId:         catDoc._id,
      cityId:             cityDoc._id,
      description:        description  || "",
      address:            location     || "",
      priceRange:         priceRange   || "",
      sourceLang:         sourceLang   || "fr",
      images:             photos       || [],
      ownerId:            req.user._id,
      isVerifiedBusiness: false,
      status:             "pending",
      ...(!isNaN(parsedLat) && !isNaN(parsedLng) && {
        location: { type: "Point", coordinates: [parsedLng, parsedLat] },
      }),
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

    // Notifications: confirm to owner + alert all admins
    const owner = await User.findById(req.user._id).select("firstName lastName").lean();
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.trim() : "A user";
    notify.businessSubmitted(req.user._id, name, business._id).catch(() => {});
    notifyAdmins((adminId) => notify.adminBusinessSubmitted(adminId, ownerName, name, business._id));

    res.status(201).json(toFrontend(populated));
  } catch (err) { next(err); }
});

// PUT /businesses/:id — edit a listing; always requires re-approval
router.put("/:id", protect, async (req, res, next) => {
  try {
    const existing = await Place.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Business introuvable" });
    if (existing.ownerId?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès refusé" });

    const { name, description, address, priceRange, location, lat, lng, keepImages } = req.body;
    const updates = {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(address     !== undefined && { address }),
      ...(priceRange  !== undefined && { priceRange }),
      ...(Array.isArray(keepImages) && { images: keepImages }),
    };

    // Add updated coordinates if provided
    const parsedLat = lat != null ? parseFloat(lat) : NaN;
    const parsedLng = lng != null ? parseFloat(lng) : NaN;
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      updates.location = { type: "Point", coordinates: [parsedLng, parsedLat] };
    }

    // Always set back to pending and clear any previous rejection reason
    updates.status             = "pending";
    updates.isVerifiedBusiness = false;
    updates.rejectionReason    = "";

    // Replace any existing pending request to avoid duplicate entries in the admin queue
    await PendingRequest.deleteMany({ placeId: existing._id, status: "pending" });
    await PendingRequest.create({
      requestType: "business_verification",
      requestedBy: req.user._id,
      placeId:     existing._id,
      payload:     {
        name:        name        || existing.name,
        description: description || existing.description,
        location:    address     || existing.address,
      },
    });

    const business = await Place.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("cityId",     "name slug")
      .populate("categoryId", "name slug icon");

    const owner = await User.findById(req.user._id).select("firstName lastName").lean();
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.trim() : "A user";
    notify.businessUpdated(req.user._id, business.name, business._id).catch(() => {});
    notifyAdmins((adminId) => notify.adminBusinessSubmitted(adminId, ownerName, business.name, business._id));

    res.json(toFrontend(business));
  } catch (err) { next(err); }
});

// DELETE /businesses/:id — soft-delete via status (owner only)
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const business = await Place.findById(req.params.id);
    if (!business) return res.status(404).json({ message: "Business introuvable" });
    if (business.ownerId?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès refusé" });

    // Cancel any pending review request so it no longer appears in the admin queue
    await PendingRequest.deleteMany({ placeId: req.params.id, status: "pending" });
    await Place.findByIdAndUpdate(req.params.id, { status: "archived" });

    const owner = await User.findById(req.user._id).select("firstName lastName").lean();
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.trim() : "A user";
    notify.businessDeleted(req.user._id, business.name).catch(() => {});
    notifyAdmins((adminId) => notify.adminBusinessDeleted(adminId, ownerName, business.name));

    res.json({ message: "Business archivé" });
  } catch (err) { next(err); }
});

module.exports = router;
