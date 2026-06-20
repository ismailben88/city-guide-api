const AdminLog       = require("../models/AdminLog");
const PendingRequest = require("../models/PendingRequest");
const Place          = require("../models/Place");
const GuideProfile   = require("../models/GuideProfile");
const Media          = require("../models/Media");
const User           = require("../models/User");
const Event          = require("../models/Event");
const Comment        = require("../models/Comment");
const Report         = require("../models/Report");
const PageView       = require("../models/PageView");
const ApiError       = require("../utils/ApiError");
const notify         = require("../helpers/notify");
const cacheService   = require("./cache.service");
const { deleteUploadedFiles } = require("./fileCleanup.service");
const { reconcileEventStatusesThrottled } = require("./eventStatus.service");
const { getPagination } = require("../utils/pagination.utils");

// Purge verification documents from DB + disk — called after any guide_verification decision
async function purgeVerificationDocs(payload = {}) {
  const urls = [payload.idDocumentUrl, payload.entrepreneurDocUrl].filter(Boolean);
  if (!urls.length) return;
  await Media.deleteMany({ url: { $in: urls } });
  await deleteUploadedFiles(urls).catch(() => {});
}

// ─── Pending Requests ─────────────────────────────────────────────────────────

const getPendingRequests = async (query) => {
  const { requestType, status = "pending", ...rest } = query;
  const { skip, limit } = getPagination(rest);

  const filter = { status };
  if (requestType) filter.requestType = requestType;

  return PendingRequest.find(filter)
    .populate("requestedBy", "firstName lastName email avatarUrl")
    .populate("placeId", "name slug city category address isVerifiedBusiness status")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

const getPendingRequestById = async (id) => {
  const request = await PendingRequest.findById(id)
    .populate("requestedBy", "firstName lastName email avatarUrl")
    .populate("placeId", "name slug city category address isVerifiedBusiness status");
  if (!request) throw new ApiError(404, "Demande introuvable");
  return request;
};

const approvePendingRequest = async (id, adminId) => {
  const request = await PendingRequest.findById(id);
  if (!request) throw new ApiError(404, "Demande introuvable");
  if (request.status !== "pending") throw new ApiError(400, "Cette demande a déjà été traitée");

  // Guard: for business requests, verify the listing still exists and was not deleted by the owner
  if (request.requestType === "business_verification") {
    const place = await Place.findById(request.placeId).select("status ownerId").lean();
    if (!place || place.status === "archived") {
      await PendingRequest.findByIdAndUpdate(id, {
        status:     "rejected",
        reviewedBy: adminId,
        reason:     "Listing was removed by the owner before this request was processed.",
      });
      await AdminLog.create({
        adminId, action: "auto_reject_business",
        targetType: "Place", targetId: request.placeId,
        metadata: { requestId: id, reason: "owner_deleted" },
      });
      throw new ApiError(409, "This listing was deleted by its owner. The request has been automatically rejected.");
    }
    // Ownership guard: never transfer an already-claimed listing to a different
    // user through a verification request. Only unowned listings (or ones the
    // requester already owns) may be assigned on approval.
    if (place.ownerId && place.ownerId.toString() !== request.requestedBy.toString()) {
      throw new ApiError(409, "This listing already belongs to another owner and cannot be reassigned.");
    }
  }

  request.status     = "approved";
  request.reviewedBy = adminId;
  await request.save();

  const userId = request.requestedBy;

  if (request.requestType === "guide_application") {
    const payload = request.payload || {};

    if (payload.guideId) {
      // Profile was pre-created by the user via the BecomeGuide form — just approve it
      await GuideProfile.findByIdAndUpdate(payload.guideId, {
        verificationStatus: "verified",
        isPublished:        true,
      });
    } else {
      // Application-only flow: no profile exists yet — create from payload
      const { bio = "", tagline = "", specialties = [], spokenLanguages = [], cityIds = [], pricePerHour = 0 } = payload;
      await GuideProfile.create({
        userId, bio, tagline, specialties, spokenLanguages, cityIds, pricePerHour,
        isPublished:        true,
        verificationStatus: "verified",
        certified:          false,
      });
    }

    await User.findByIdAndUpdate(userId, { isGuide: true });
    cacheService.delByPrefix("guides");
    // Purge identity documents submitted with the application (privacy)
    if (payload.idDocumentUrl || payload.entrepreneurDocUrl) {
      purgeVerificationDocs({ idDocumentUrl: payload.idDocumentUrl, entrepreneurDocUrl: payload.entrepreneurDocUrl }).catch(() => {});
    }
    await AdminLog.create({
      adminId, action: "approve_guide_application",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id },
    });
    notify.guideProfilePublished(userId).catch(() => {});
  }

  if (request.requestType === "guide_verification") {
    const user = await User.findById(userId).select("firstName").lean();
    await GuideProfile.findOneAndUpdate({ userId }, { verificationStatus: "verified", verifiedBy: adminId, certified: true });
    cacheService.delByPrefix("guides");
    purgeVerificationDocs(request.payload).catch(() => {});
    await AdminLog.create({
      adminId, action: "approve_guide_verification",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id },
    });
    notify.newGuideVerified(userId, user?.firstName || "Guide").catch(() => {});
  }

  if (request.requestType === "business_verification") {
    const place = await Place.findByIdAndUpdate(
      request.placeId,
      { isVerifiedBusiness: true, status: "active", ownerId: userId },
      { new: true }
    );
    await AdminLog.create({
      adminId, action: "approve_business",
      targetType: "Place", targetId: request.placeId,
      metadata: { requestId: id },
    });
    notify.businessVerified(userId, place?.name || "", request.placeId).catch(() => {});
  }

  return request;
};

const rejectPendingRequest = async (id, adminId, reason = "") => {
  const request = await PendingRequest.findById(id);
  if (!request) throw new ApiError(404, "Demande introuvable");
  if (request.status !== "pending") throw new ApiError(400, "Cette demande a déjà été traitée");

  request.status     = "rejected";
  request.reviewedBy = adminId;
  request.reason     = reason;
  await request.save();

  const userId = request.requestedBy;

  if (request.requestType === "guide_application") {
    const payload = request.payload || {};
    if (payload.guideId) {
      // Remove the pre-created profile since the application is rejected
      await GuideProfile.findByIdAndDelete(payload.guideId);
      await User.findByIdAndUpdate(userId, { isGuide: false });
      cacheService.delByPrefix("guides");
    }
    // Purge identity documents submitted with the application (privacy)
    if (payload.idDocumentUrl || payload.entrepreneurDocUrl) {
      purgeVerificationDocs({ idDocumentUrl: payload.idDocumentUrl, entrepreneurDocUrl: payload.entrepreneurDocUrl }).catch(() => {});
    }
    await AdminLog.create({
      adminId, action: "reject_guide_application",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id, reason },
    });
    notify.guideApplicationRejected(userId, reason).catch(() => {});
  }

  if (request.requestType === "guide_verification") {
    await GuideProfile.findOneAndUpdate({ userId }, { verificationStatus: "rejected" });
    cacheService.delByPrefix("guides");
    purgeVerificationDocs(request.payload).catch(() => {});
    await AdminLog.create({
      adminId, action: "reject_guide_verification",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id, reason },
    });
    notify.guideVerificationRejected(userId, reason).catch(() => {});
  }

  if (request.requestType === "business_verification") {
    const place = await Place.findByIdAndUpdate(
      request.placeId,
      { status: "rejected", rejectionReason: reason || "" },
      { new: true }
    );
    await AdminLog.create({
      adminId, action: "reject_business",
      targetType: "Place", targetId: request.placeId,
      metadata: { requestId: id, reason },
    });
    notify.businessRejected(userId, place?.name || "", reason).catch(() => {});
  }

  return request;
};

// ─── Admin Logs ───────────────────────────────────────────────────────────────

const getAdminLogs = async (query) => {
  const { targetType, targetId, action, ...rest } = query;
  const { skip, limit } = getPagination(rest);

  const filter = {};
  if (targetType) filter.targetType = targetType;
  if (targetId)   filter.targetId   = targetId;
  if (action)     filter.action     = { $regex: action, $options: "i" };

  return AdminLog.find(filter)
    .populate("adminId", "firstName lastName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// ─── Dashboard & Stats ────────────────────────────────────────────────────────

const getStats = async () => {
  // "upcoming events" is counted off the stored status — make sure it's fresh.
  reconcileEventStatusesThrottled();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [users, places, events, guides, pendingRequests, comments, reports, totalVisits, todayVisits, uniqueVisitorsRes, uniqueVisitorsTodayRes] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Place.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "upcoming" }),
    GuideProfile.countDocuments({ verificationStatus: "verified" }),
    PendingRequest.countDocuments({ status: "pending" }),
    Comment.countDocuments({ status: "active" }),
    Report.countDocuments({ status: "open" }),
    PageView.countDocuments(),
    PageView.countDocuments({ createdAt: { $gte: todayStart } }),
    PageView.aggregate([{ $group: { _id: "$sessionId" } }, { $count: "count" }]),
    PageView.aggregate([{ $match: { createdAt: { $gte: todayStart } } }, { $group: { _id: "$sessionId" } }, { $count: "count" }]),
  ]);

  const uniqueVisitors      = uniqueVisitorsRes[0]?.count      ?? 0;
  const uniqueVisitorsToday = uniqueVisitorsTodayRes[0]?.count ?? 0;

  return { users, places, events, guides, pendingRequests, comments, reports, totalVisits, todayVisits, uniqueVisitors, uniqueVisitorsToday };
};

const getDashboard = async () => {
  const [counts, recentLogs, recentRequests] = await Promise.all([
    Promise.all([
      User.countDocuments({ isActive: true }),
      Place.countDocuments({ status: "active" }),
      Event.countDocuments({ status: "upcoming" }),
      GuideProfile.countDocuments({ verificationStatus: "verified" }),
    ]),
    AdminLog.find().sort({ createdAt: -1 }).limit(10).populate("adminId", "firstName lastName"),
    PendingRequest.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("requestedBy", "firstName lastName"),
  ]);

  const [users, places, events, guides] = counts;
  return { stats: { users, places, events, guides }, recentLogs, recentRequests };
};

// ─── Analytics ────────────────────────────────────────────────────────────────

const getAnalytics = async () => {
  const now   = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthLabel = (y, m) =>
    new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "2-digit" });

  const fillMonths = (raw) => {
    const map = {};
    raw.forEach(({ _id, count }) => { map[`${_id.year}-${_id.month}`] = count; });
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      result.push({ month: monthLabel(y, m), count: map[`${y}-${m}`] || 0 });
    }
    return result;
  };

  const groupByMonth = (model) =>
    model.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    ]);

  const [
    monthlyUsers,
    monthlyEvents,
    monthlyVisits,
    placesByCat,
    placesByCity,
    eventsByCity,
    guidesByCity,
    userRoles,
    featuredPlaces,
    featuredEvents,
    topPages,
  ] = await Promise.all([
    groupByMonth(User),
    groupByMonth(Event),
    groupByMonth(PageView),
    Place.aggregate([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ["$cat.name", "Other"] }, icon: { $ifNull: ["$cat.icon", "📍"] }, count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Place.aggregate([
      { $group: { _id: "$cityId", count: { $sum: 1 } } },
      { $lookup: { from: "cities", localField: "_id", foreignField: "_id", as: "city" } },
      { $unwind: { path: "$city", preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ["$city.name", "Unknown"] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Event.aggregate([
      { $group: { _id: "$cityId", count: { $sum: 1 } } },
      { $lookup: { from: "cities", localField: "_id", foreignField: "_id", as: "city" } },
      { $unwind: { path: "$city", preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ["$city.name", "Unknown"] }, count: 1 } },
    ]),
    GuideProfile.aggregate([
      { $unwind: { path: "$cityIds", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$cityIds", count: { $sum: 1 } } },
      { $lookup: { from: "cities", localField: "_id", foreignField: "_id", as: "city" } },
      { $unwind: { path: "$city", preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ["$city.name", "Unknown"] }, count: 1 } },
    ]),
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $project: { role: "$_id", count: 1, _id: 0 } },
    ]),
    Place.countDocuments({ isFeatured: true }),
    Event.countDocuments({ isFeatured: true }),
    PageView.aggregate([
      { $group: { _id: "$path", visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
      { $limit: 6 },
      { $project: { _id: 0, path: "$_id", visits: 1 } },
    ]),
  ]);

  // Merge places + events + guides per city into a single overview array
  const cityMap = {};
  const ensureCity = (name) => { if (!cityMap[name]) cityMap[name] = { city: name, places: 0, events: 0, guides: 0 }; };
  placesByCity.forEach(({ name, count }) => { ensureCity(name); cityMap[name].places = count; });
  eventsByCity.forEach(({ name, count }) => { ensureCity(name); cityMap[name].events = count; });
  guidesByCity.forEach(({ name, count }) => { ensureCity(name); cityMap[name].guides = count; });
  const citiesOverview = Object.values(cityMap)
    .sort((a, b) => (b.places + b.events + b.guides) - (a.places + a.events + a.guides));

  return {
    monthlyUsers:     fillMonths(monthlyUsers),
    monthlyEvents:    fillMonths(monthlyEvents),
    monthlyVisits:    fillMonths(monthlyVisits),
    placesByCategory: placesByCat.map((p) => ({ name: p.name, icon: p.icon, value: p.count })),
    citiesOverview,
    userRoles:        userRoles.map((r) => ({ role: r.role || "unknown", count: r.count })),
    featuredPlaces,
    featuredEvents,
    topPages,
  };
};

// ─── Comment Moderation ───────────────────────────────────────────────────────

const getAllComments = async (query) => {
  const { targetType, status, search, sortBy, sortDir, ...rest } = query;
  const { skip, limit } = getPagination(rest);

  const filter = {};
  if (targetType) filter.targetType = targetType;
  filter.status = status || { $in: ["active", "deleted", "flagged"] };
  if (search)     filter.content = { $regex: search, $options: "i" };

  const VALID_SORT = ["createdAt", "rating", "likeCount"];
  const sortField  = VALID_SORT.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder  = sortDir === "asc" ? 1 : -1;

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate("authorId", "firstName lastName email avatarUrl")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments(filter),
  ]);

  return { comments, total };
};

module.exports = {
  getPendingRequests,
  getPendingRequestById,
  approvePendingRequest,
  rejectPendingRequest,
  getAdminLogs,
  getStats,
  getDashboard,
  getAnalytics,
  getAllComments,
};
