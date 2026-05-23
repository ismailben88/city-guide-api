const Place               = require("../models/Place");
const Favorite            = require("../models/Favorite");
const PendingRequest      = require("../models/PendingRequest");
const Media               = require("../models/Media");
const ApiError            = require("../utils/ApiError");
const { getPagination }   = require("../utils/pagination.utils");
const { translateFields } = require("./translate.service");
const { deleteUploadedFiles } = require("./fileCleanup.service");
const notify              = require("../helpers/notify");

// Notify all users who favorited a place — fire-and-forget helper
async function notifyFavoriters(placeId, placeName, type) {
  const favs = await Favorite.find({ targetId: placeId, targetType: "Place" }).select("userId").lean();
  if (!favs.length) return;
  const userIds = [...new Set(favs.map((f) => f.userId.toString()))];
  const fn = type === "featured" ? notify.savedPlaceFeatured
           : type === "active"   ? notify.savedPlaceNowActive
           :                       notify.savedPlaceUpdated;
  await Promise.allSettled(userIds.map((uid) => fn(uid, placeName, placeId)));
}

const POPULATE_PLACE = [
  { path: "cityId",     select: "name slug" },
  { path: "categoryId", select: "name slug icon" },
];

const getPlaces = async (query) => {
  const { cityId, categoryId, status = "active", isFeatured, ...rest } = query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (status !== "all")         filter.status     = status;
  if (cityId)                   filter.cityId     = cityId;
  if (categoryId)               filter.categoryId = categoryId;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === "true";

  const [places, total] = await Promise.all([
    Place.find(filter)
      .populate(POPULATE_PLACE)
      .sort({ isFeatured: -1, averageRating: -1 })
      .skip(skip)
      .limit(limit),
    Place.countDocuments(filter),
  ]);

  return { places, total, page, limit };
};

const searchPlaces = async ({ q, cityId, categoryId }) => {
  const filter = { status: "active" };
  if (cityId)     filter.cityId     = cityId;
  if (categoryId) filter.categoryId = categoryId;
  if (q)          filter.name       = { $regex: q, $options: "i" };

  return Place.find(filter).populate(POPULATE_PLACE).limit(50);
};

const getNearbyPlaces = async ({ lat, lng, radius = 5000 }) => {
  return Place.find({
    status: "active",
    location: {
      $near: {
        $geometry:    { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius),
      },
    },
  })
    .populate(POPULATE_PLACE)
    .limit(20);
};

const getTopPlaces = async (limit = 9) => {
  return Place.find({ status: "active" })
    .populate(POPULATE_PLACE)
    .sort({ isFeatured: -1, reviewCount: -1 })
    .limit(Number(limit));
};

const getPlaceById = async (id) => {
  if (!id || id === "undefined") throw new ApiError(400, "ID invalide");

  const place = await Place.findById(id)
    .populate(POPULATE_PLACE)
    .populate("ownerId", "firstName lastName avatarUrl");

  if (!place) throw new ApiError(404, "Place introuvable");
  return place;
};

const createPlace = async (data) => {
  const sourceLang = data.sourceLang || "fr";
  const place = await Place.create({ ...data, sourceLang, translationStatus: "pending" });

  const fields = {};
  if (place.name)        fields.name        = place.name;
  if (place.description) fields.description = place.description;
  if (place.address)     fields.address     = place.address;

  if (Object.keys(fields).length > 0) {
    translateFields(fields, sourceLang)
      .then((translations) =>
        Place.findByIdAndUpdate(place._id, { translations, translationStatus: "done" })
      )
      .catch(() =>
        Place.findByIdAndUpdate(place._id, { translationStatus: "failed" })
      );
  }

  return place;
};

const updatePlace = async (id, data) => {
  if (Array.isArray(data.images)) {
    const existing = await Place.findById(id).select("images");
    if (existing) {
      const removed = (existing.images ?? []).filter((img) => !data.images.includes(img));
      await deleteUploadedFiles(removed);
    }
  }

  const before = await Place.findById(id).select("status").lean();
  const place  = await Place.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!place) throw new ApiError(404, "Place introuvable");

  // Notify favoriting users: status became active, or general content update
  if (data.status === "active" && before?.status !== "active") {
    notifyFavoriters(place._id, place.name, "active").catch(() => {});
  } else if (Object.keys(data).some((k) => ["name", "description", "address", "images", "priceRange"].includes(k))) {
    notifyFavoriters(place._id, place.name, "updated").catch(() => {});
  }

  return place;
};

const archivePlace = async (id) => {
  await Place.findByIdAndUpdate(id, { status: "archived" });
};

const permanentDeletePlace = async (id) => {
  const place = await Place.findByIdAndDelete(id);
  if (!place) throw new ApiError(404, "Place introuvable");
  if (place.images?.length) {
    await deleteUploadedFiles(place.images);
  }
};

const toggleFeature = async (id, isFeatured) => {
  const place = await Place.findByIdAndUpdate(id, { isFeatured }, { new: true });
  if (!place) throw new ApiError(404, "Place introuvable");
  if (isFeatured) notifyFavoriters(place._id, place.name, "featured").catch(() => {});
  return place.isFeatured;
};

const attachMedia = async ({ placeId, file, caption, userId }) => {
  const type  = file.mimetype.startsWith("video") ? "video" : "image";
  return Media.create({
    url:        `/uploads/${file.filename}`,
    type,
    parentType: "Place",
    parentId:   placeId,
    uploadedBy: userId,
    caption:    caption || "",
  });
};

const claimBusiness = async ({ placeId, userId, payload }) => {
  return PendingRequest.create({
    requestType: "business_verification",
    requestedBy: userId,
    placeId,
    payload,
  });
};

module.exports = {
  getPlaces,
  searchPlaces,
  getNearbyPlaces,
  getTopPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  archivePlace,
  permanentDeletePlace,
  toggleFeature,
  attachMedia,
  claimBusiness,
};
