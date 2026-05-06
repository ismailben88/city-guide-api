const GuideProfile   = require("../models/GuideProfile");
const User           = require("../models/User");
const PendingRequest = require("../models/PendingRequest");
const City           = require("../models/City");
const ApiError       = require("../utils/ApiError");
const { getPagination } = require("../utils/pagination.utils");
const { Types } = require("mongoose");

const POPULATE_GUIDE = [
  { path: "userId",  select: "firstName lastName avatarUrl email phone whatsapp instagram website role" },
  { path: "cityIds", select: "name slug" },
];

// Mappe document Mongoose → structure attendue par le frontend
const toFrontend = (doc) => {
  const g    = doc.toObject ? doc.toObject() : doc;
  g.user     = g.userId;   delete g.userId;
  g.cities   = g.cityIds;  delete g.cityIds;
  g.contact  = {
    email:     g.user?.email     || "",
    phone:     g.user?.phone     || "",
    whatsapp:  g.user?.whatsapp  || "",
    instagram: g.user?.instagram || "",
    website:   g.user?.website   || "",
  };
  return g;
};

// Résout des slugs de villes ou des ObjectId string → tableau d'ObjectIds
const resolveCityIds = async (rawIds = []) => {
  const slugs = [];
  const ids   = [];
  for (const v of rawIds) {
    if (Types.ObjectId.isValid(v) && String(new Types.ObjectId(v)) === v) {
      ids.push(v);
    } else {
      slugs.push(v);
    }
  }
  if (!slugs.length) return ids;
  const docs = await City.find({ slug: { $in: slugs } }).select("_id");
  return [...ids, ...docs.map((d) => d._id)];
};

const getGuides = async (query) => {
  const { cityId, userId, verificationStatus = "verified", ...rest } = query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (userId) {
    filter.userId = userId;
  } else {
    filter.verificationStatus = verificationStatus;
    if (cityId) filter.cityIds = cityId;
  }

  const guides = await GuideProfile.find(filter)
    .populate(POPULATE_GUIDE)
    .sort({ averageRating: -1 })
    .skip(skip)
    .limit(limit);

  return guides.map(toFrontend);
};

const getNearbyGuides = async () => {
  const guides = await GuideProfile.find({ verificationStatus: "verified" })
    .populate(POPULATE_GUIDE)
    .limit(20);
  return guides.map(toFrontend);
};

const getGuideById = async (id) => {
  const guide = await GuideProfile.findById(id).populate(POPULATE_GUIDE);
  if (!guide) throw new ApiError(404, "Guide introuvable");
  return toFrontend(guide);
};

const createGuideProfile = async (userId, data) => {
  const exists = await GuideProfile.findOne({ userId });
  if (exists) throw new ApiError(400, "Profil guide déjà existant");

  const cityIds = await resolveCityIds(data.cityIds ?? []);

  const [guide] = await Promise.all([
    GuideProfile.create({ ...data, cityIds, userId }),
    PendingRequest.create({ requestType: "guide_application", requestedBy: userId, payload: data }),
  ]);

  return guide;
};

const updateGuideProfile = async (id, data) => {
  const update = { ...data };
  if (update.cityIds) update.cityIds = await resolveCityIds(update.cityIds);

  const guide = await GuideProfile.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!guide) throw new ApiError(404, "Guide introuvable");
  return toFrontend(guide);
};

const deleteGuideProfile = async (id) => {
  const guide = await GuideProfile.findByIdAndDelete(id);
  if (guide) await User.findByIdAndUpdate(guide.userId, { isGuide: false });
};

const updateAvailability = async (id, availability) => {
  const guide = await GuideProfile.findByIdAndUpdate(id, { availability }, { new: true });
  if (!guide) throw new ApiError(404, "Guide introuvable");
  return guide.availability;
};

module.exports = {
  getGuides,
  getNearbyGuides,
  getGuideById,
  createGuideProfile,
  updateGuideProfile,
  deleteGuideProfile,
  updateAvailability,
};
