const GuideProfile   = require("../model/GuideProfile");
const User           = require("../model/User");
const PendingRequest = require("../model/PendingRequest");
const City           = require("../model/City");
const { Types }      = require("mongoose");

// Resolve an array of city slugs / ObjectId strings to real ObjectIds.
// Values that are already valid ObjectIds are passed through unchanged.
async function resolveCityIds(rawIds = []) {
  const slugs = [];
  const ids   = [];
  for (const v of rawIds) {
    if (Types.ObjectId.isValid(v) && String(new Types.ObjectId(v)) === v) {
      ids.push(v);
    } else {
      slugs.push(v);
    }
  }
  if (slugs.length === 0) return ids;
  const docs = await City.find({ slug: { $in: slugs } }).select("_id");
  return [...ids, ...docs.map((d) => d._id)];
}

// Transforme un document Mongoose pour correspondre à la structure db.json
// userId → user  /  cityIds → cities  /  contact construit depuis User
const toFrontend = (doc) => {
  const g = doc.toObject ? doc.toObject() : doc;
  g.user   = g.userId;   delete g.userId;
  g.cities = g.cityIds;  delete g.cityIds;
  // All contact fields live on the User model — expose as a unified contact object
  g.contact = {
    email:     g.user?.email     || "",
    phone:     g.user?.phone     || "",
    whatsapp:  g.user?.whatsapp  || "",
    instagram: g.user?.instagram || "",
    website:   g.user?.website   || "",
  };
  return g;
};

// GET /guideProfiles
exports.getGuides = async (req, res, next) => {
  try {
    const { cityId, userId, verificationStatus = "verified", limit = 20, page = 1 } = req.query;
    const filter = {};
    if (userId) {
      filter.userId = userId;
    } else {
      filter.verificationStatus = verificationStatus;
      if (cityId) filter.cityIds = cityId;
    }

    const guides = await GuideProfile.find(filter)
      .populate("userId", "firstName lastName avatarUrl email phone whatsapp instagram website role")
      .populate("cityIds", "name slug")
      .sort({ averageRating: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(guides.map(toFrontend));
  } catch (err) { next(err); }
};

// GET /guideProfiles/nearby
exports.getNearbyGuides = async (req, res, next) => {
  try {
    const guides = await GuideProfile.find({ verificationStatus: "verified" })
      .populate("userId", "firstName lastName avatarUrl role")
      .populate("cityIds", "name slug")
      .limit(20);

    res.json(guides.map(toFrontend));
  } catch (err) { next(err); }
};

// GET /guideProfiles/:id
exports.getGuideById = async (req, res, next) => {
  try {
    const guide = await GuideProfile.findById(req.params.id)
      .populate("userId", "firstName lastName avatarUrl email phone whatsapp instagram website role")
      .populate("cityIds", "name slug");

    if (!guide) return res.status(404).json({ message: "Guide introuvable" });
    res.json(toFrontend(guide));
  } catch (err) { next(err); }
};

// POST /guideProfiles
exports.createGuideProfile = async (req, res, next) => {
  try {
    const exists = await GuideProfile.findOne({ userId: req.user._id });
    if (exists) return res.status(400).json({ message: "Profil guide déjà existant" });

    // cityIds may arrive as slug strings ("marrakech") — resolve to ObjectIds
    const cityIds = await resolveCityIds(req.body.cityIds ?? []);

    const [guide] = await Promise.all([
      GuideProfile.create({ ...req.body, cityIds, userId: req.user._id }),
      PendingRequest.create({
        requestType: "guide_application",
        requestedBy: req.user._id,
        payload: req.body,
      }),
    ]);

    res.status(201).json(guide);
  } catch (err) { next(err); }
};

// PUT /guideProfiles/:id
exports.updateGuideProfile = async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.cityIds) update.cityIds = await resolveCityIds(update.cityIds);

    const guide = await GuideProfile.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!guide) return res.status(404).json({ message: "Guide introuvable" });
    res.json(toFrontend(guide));
  } catch (err) { next(err); }
};

// DELETE /guideProfiles/:id
exports.deleteGuideProfile = async (req, res, next) => {
  try {
    const guide = await GuideProfile.findByIdAndDelete(req.params.id);
    if (guide) await User.findByIdAndUpdate(guide.userId, { isGuide: false });
    res.json({ message: "Profil guide supprimé" });
  } catch (err) { next(err); }
};

// PUT /guideProfiles/:id/availability
exports.updateAvailability = async (req, res, next) => {
  try {
    const guide = await GuideProfile.findByIdAndUpdate(
      req.params.id,
      { availability: req.body.availability },
      { new: true }
    );
    res.json({ availability: guide.availability });
  } catch (err) { next(err); }
};
