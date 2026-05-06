const Place          = require("../models/Place");
const PendingRequest = require("../models/PendingRequest");
const Media          = require("../models/Media");
const ApiError       = require("../utils/ApiError");
const { getPagination } = require("../utils/pagination.utils");

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

const createPlace = async (data) => Place.create(data);

const updatePlace = async (id, data) => {
  const place = await Place.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!place) throw new ApiError(404, "Place introuvable");
  return place;
};

const archivePlace = async (id) => {
  await Place.findByIdAndUpdate(id, { status: "archived" });
};

const toggleFeature = async (id, isFeatured) => {
  const place = await Place.findByIdAndUpdate(id, { isFeatured }, { new: true });
  if (!place) throw new ApiError(404, "Place introuvable");
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
  toggleFeature,
  attachMedia,
  claimBusiness,
};
