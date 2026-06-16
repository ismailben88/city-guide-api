const GuideProfile   = require("../models/GuideProfile");
const User           = require("../models/User");
const Media          = require("../models/Media");
const PendingRequest = require("../models/PendingRequest");
const City           = require("../models/City");
const notify         = require("../helpers/notify");
const ApiError       = require("../utils/ApiError");
const { getPagination } = require("../utils/pagination.utils");
const { Types } = require("mongoose");
const { deleteUploadedFile, deleteUploadedFiles } = require("./fileCleanup.service");

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

const getGuides = async (query, requester = null) => {
  const { cityId, userId, ...rest } = query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (userId) {
    filter.userId = userId;
    // Only the owner (or an admin) may see an unpublished/paused profile via a
    // direct userId lookup; anyone else gets the public predicate.
    const isPrivileged = requester &&
      (requester.role === "admin" || requester._id.toString() === String(userId));
    if (!isPrivileged) {
      filter.isPublished = true;
      filter.isPaused = { $ne: true };
    }
  } else {
    filter.isPublished = true;
    filter.isPaused = { $ne: true };
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
  const guides = await GuideProfile.find({ isPublished: true, isPaused: { $ne: true } })
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

  const guide = await GuideProfile.create({ ...data, cityIds, userId, verificationStatus: "unverified" });
  await User.findByIdAndUpdate(userId, { isGuide: true });

  // Create a pending request immediately so admin sees all new guide applications
  await PendingRequest.create({
    requestType: "guide_application",
    requestedBy: userId,
    payload:     { guideId: guide._id },
  });

  // Notify the user that their application was received
  notify.guideApplicationReceived(userId).catch(() => {});

  return guide;
};

const submitVerificationDocuments = async (guideId, userId, { idDocumentUrl, entrepreneurDocUrl }) => {
  const guide = await GuideProfile.findById(guideId);
  if (!guide) throw new ApiError(404, "Guide introuvable");
  if (guide.userId.toString() !== userId.toString()) throw new ApiError(403, "Accès refusé");
  if (guide.certified) throw new ApiError(400, "Profil déjà certifié");
  if (guide.verificationStatus === "pending") throw new ApiError(400, "Demande de vérification déjà en cours");
  if (!idDocumentUrl || !entrepreneurDocUrl) throw new ApiError(400, "Les deux documents sont requis");

  const now = new Date();
  await GuideProfile.findByIdAndUpdate(guideId, {
    verificationStatus: "pending",
    verificationDocuments: {
      idDocument:      { url: idDocumentUrl,      uploadedAt: now },
      entrepreneurDoc: { url: entrepreneurDocUrl, uploadedAt: now },
    },
  });

  // Upsert a guide_verification request so admin can review the documents separately
  await PendingRequest.findOneAndUpdate(
    { requestedBy: userId, requestType: "guide_verification", status: "pending" },
    { payload: { guideId, idDocumentUrl, entrepreneurDocUrl } },
    { upsert: true, new: true }
  );

  notify.guideVerificationDocumentsReceived(userId).catch(() => {});

  return { message: "Documents soumis pour vérification" };
};

// Fields users must never be able to modify directly
const PROTECTED_FIELDS = new Set([
  "userId", "isPublished", "verificationStatus", "verifiedBy",
  "averageRating", "reviewCount", "certified",
]);

const updateGuideProfile = async (id, userId, data) => {
  const existing = await GuideProfile.findById(id).select("userId bannerUrl");
  if (!existing) throw new ApiError(404, "Guide introuvable");
  if (existing.userId.toString() !== userId.toString()) throw new ApiError(403, "Accès refusé");

  // Strip any protected fields from the incoming payload
  const update = Object.fromEntries(
    Object.entries(data).filter(([k]) => !PROTECTED_FIELDS.has(k))
  );

  // Server-side validation
  if (update.tagline !== undefined) {
    const t = String(update.tagline).trim();
    if (t.length > 0 && t.length < 10) throw new ApiError(400, "Tagline must be at least 10 characters");
    if (t.length > 60)                  throw new ApiError(400, "Tagline must be 60 characters or fewer");
  }
  if (update.bio !== undefined) {
    const b = String(update.bio).trim();
    if (b.length > 0 && b.length < 30) throw new ApiError(400, "Bio must be at least 30 characters");
    if (b.length > 600)                 throw new ApiError(400, "Bio must be 600 characters or fewer");
  }
  if (update.pricePerHour !== undefined) {
    const p = Number(update.pricePerHour);
    if (isNaN(p) || p < 0)    throw new ApiError(400, "Invalid price");
    if (p > 0 && p < 50)      throw new ApiError(400, "Minimum rate is 50 MAD");
    update.pricePerHour = p;
  }
  if (update.experienceYears !== undefined) {
    const y = Number(update.experienceYears);
    if (isNaN(y) || y < 0 || y > 80) throw new ApiError(400, "Invalid experience");
    update.experienceYears = y;
  }

  if (update.cityIds) update.cityIds = await resolveCityIds(update.cityIds);

  if (update.bannerUrl !== undefined) {
    // Reject blob: / data: URLs — only accept server-relative or absolute http(s) paths
    if (/^(blob:|data:)/i.test(update.bannerUrl)) {
      delete update.bannerUrl;
    } else {
      if (existing.bannerUrl && existing.bannerUrl !== update.bannerUrl) {
        await deleteUploadedFile(existing.bannerUrl);
      }
    }
  }

  const guide = await GuideProfile.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!guide) throw new ApiError(404, "Guide introuvable");
  return toFrontend(guide);
};

const deleteGuideProfile = async (id) => {
  const guide = await GuideProfile.findByIdAndDelete(id);
  if (!guide) return;

  await User.findByIdAndUpdate(guide.userId, { isGuide: false });

  if (guide.bannerUrl) await deleteUploadedFile(guide.bannerUrl);

  const media = await Media.find({ parentId: id, parentType: "GuideProfile" });
  await deleteUploadedFiles(media.map((m) => m.url));
  await Media.deleteMany({ parentId: id, parentType: "GuideProfile" });
};

const updateAvailability = async (id, userId, availability) => {
  const guide = await GuideProfile.findById(id).select("userId availability");
  if (!guide) throw new ApiError(404, "Guide introuvable");
  if (guide.userId.toString() !== userId.toString()) throw new ApiError(403, "Accès refusé");
  guide.availability = availability;
  await guide.save();
  return guide.availability;
};

const pauseGuideProfile = async (id, userId) => {
  const guide = await GuideProfile.findById(id).select("userId");
  if (!guide) throw new ApiError(404, "Guide introuvable");
  if (guide.userId.toString() !== userId.toString()) throw new ApiError(403, "Accès refusé");
  await GuideProfile.findByIdAndUpdate(id, { isPaused: true });
  return { isPaused: true };
};

const resumeGuideProfile = async (id, userId) => {
  const guide = await GuideProfile.findById(id).select("userId");
  if (!guide) throw new ApiError(404, "Guide introuvable");
  if (guide.userId.toString() !== userId.toString()) throw new ApiError(403, "Accès refusé");
  await GuideProfile.findByIdAndUpdate(id, { isPaused: false });
  return { isPaused: false };
};

const selfDeleteGuideProfile = async (id, userId) => {
  const guide = await GuideProfile.findById(id).select("userId bannerUrl");
  if (!guide) return;
  if (guide.userId.toString() !== userId.toString()) throw new ApiError(403, "Accès refusé");

  await GuideProfile.findByIdAndDelete(id);
  await User.findByIdAndUpdate(userId, { isGuide: false });

  if (guide.bannerUrl) await deleteUploadedFile(guide.bannerUrl);
  const media = await Media.find({ parentId: id, parentType: "GuideProfile" });
  await deleteUploadedFiles(media.map((m) => m.url));
  await Media.deleteMany({ parentId: id, parentType: "GuideProfile" });
};

module.exports = {
  getGuides,
  getNearbyGuides,
  getGuideById,
  createGuideProfile,
  submitVerificationDocuments,
  updateGuideProfile,
  deleteGuideProfile,
  updateAvailability,
  pauseGuideProfile,
  resumeGuideProfile,
  selfDeleteGuideProfile,
};
