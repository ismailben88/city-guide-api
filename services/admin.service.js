const AdminLog       = require("../models/AdminLog");
const PendingRequest = require("../models/PendingRequest");
const Place          = require("../models/Place");
const GuideProfile   = require("../models/GuideProfile");
const User           = require("../models/User");
const Event          = require("../models/Event");
const Comment        = require("../models/Comment");
const Report         = require("../models/Report");
const ApiError       = require("../utils/ApiError");
const notify         = require("../helpers/notify");
const { getPagination } = require("../utils/pagination.utils");

// ─── Pending Requests ─────────────────────────────────────────────────────────

const getPendingRequests = async (query) => {
  const { requestType, status = "pending", ...rest } = query;
  const { skip, limit } = getPagination(rest);

  const filter = { status };
  if (requestType) filter.requestType = requestType;

  return PendingRequest.find(filter)
    .populate("requestedBy", "firstName lastName email avatarUrl")
    .populate("placeId", "name slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

const getPendingRequestById = async (id) => {
  const request = await PendingRequest.findById(id)
    .populate("requestedBy", "firstName lastName email")
    .populate("placeId", "name slug");
  if (!request) throw new ApiError(404, "Demande introuvable");
  return request;
};

const approvePendingRequest = async (id, adminId) => {
  const request = await PendingRequest.findById(id);
  if (!request) throw new ApiError(404, "Demande introuvable");
  if (request.status !== "pending") throw new ApiError(400, "Cette demande a déjà été traitée");

  request.status     = "approved";
  request.reviewedBy = adminId;
  await request.save();

  const userId = request.requestedBy;

  if (request.requestType === "guide_application") {
    await GuideProfile.findOneAndUpdate({ userId }, { isPublished: true });
    await AdminLog.create({
      adminId, action: "approve_guide_application",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id },
    });
    notify.guideProfilePublished(userId).catch(() => {});
  }

  if (request.requestType === "guide_verification") {
    await GuideProfile.findOneAndUpdate({ userId }, { verificationStatus: "verified", verifiedBy: adminId, isPublished: true });
    await User.findByIdAndUpdate(userId, { isGuide: true });
    const user = await User.findById(userId).select("firstName").lean();
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
    await AdminLog.create({
      adminId, action: "reject_guide_application",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id, reason },
    });
    notify.guideApplicationRejected(userId).catch(() => {});
  }

  if (request.requestType === "guide_verification") {
    await GuideProfile.findOneAndUpdate({ userId }, { verificationStatus: "rejected" });
    await AdminLog.create({
      adminId, action: "reject_guide_verification",
      targetType: "GuideProfile", targetId: userId,
      metadata: { requestId: id, reason },
    });
    notify.guideVerificationRejected(userId).catch(() => {});
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
  if (action)     filter.action     = action;

  return AdminLog.find(filter)
    .populate("adminId", "firstName lastName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// ─── Dashboard & Stats ────────────────────────────────────────────────────────

const getStats = async () => {
  const [users, places, events, guides, pendingRequests, comments, reports] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Place.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "upcoming" }),
    GuideProfile.countDocuments({ verificationStatus: "verified" }),
    PendingRequest.countDocuments({ status: "pending" }),
    Comment.countDocuments({ status: "active" }),
    Report.countDocuments({ status: "open" }),
  ]);

  return { users, places, events, guides, pendingRequests, comments, reports };
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
    placesByCat,
    placesByCity,
    userRoles,
    featuredPlaces,
    featuredEvents,
  ] = await Promise.all([
    groupByMonth(User),
    groupByMonth(Event),
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
      { $limit: 8 },
    ]),
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $project: { role: "$_id", count: 1, _id: 0 } },
    ]),
    Place.countDocuments({ isFeatured: true }),
    Event.countDocuments({ isFeatured: true }),
  ]);

  return {
    monthlyUsers:     fillMonths(monthlyUsers),
    monthlyEvents:    fillMonths(monthlyEvents),
    placesByCategory: placesByCat.map((p) => ({ name: p.name, icon: p.icon, value: p.count })),
    placesByCity:     placesByCity.map((p) => ({ city: p.name, places: p.count })),
    userRoles:        userRoles.map((r) => ({ role: r.role || "unknown", count: r.count })),
    featuredPlaces,
    featuredEvents,
  };
};

// ─── Comment Moderation ───────────────────────────────────────────────────────

const getAllComments = async (query) => {
  const { targetType, status, search, ...rest } = query;
  const { skip, limit } = getPagination(rest);

  const filter = {};
  if (targetType) filter.targetType = targetType;
  filter.status = status || { $in: ["active", "deleted", "flagged"] };
  if (search)     filter.content = { $regex: search, $options: "i" };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate("authorId", "firstName lastName email avatarUrl")
      .sort({ createdAt: -1 })
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
