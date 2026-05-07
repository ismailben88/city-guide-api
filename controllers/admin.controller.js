const asyncHandler   = require("../utils/asyncHandler");
const ApiError       = require("../utils/ApiError");
const AdminLog       = require("../models/AdminLog");
const PendingRequest = require("../models/PendingRequest");
const Place          = require("../models/Place");
const GuideProfile   = require("../models/GuideProfile");
const User           = require("../models/User");
const Event          = require("../models/Event");
const Comment        = require("../models/Comment");
const Report         = require("../models/Report");
const Category       = require("../models/Category");
const City           = require("../models/City");
const { getPagination } = require("../utils/pagination.utils");

// ─── Pending Requests ─────────────────────────────────────────────────────────

// GET /pendingRequests
exports.getPendingRequests = asyncHandler(async (req, res) => {
  const { requestType, status = "pending", ...rest } = req.query;
  const { skip, limit } = getPagination(rest);

  const filter = { status };
  if (requestType) filter.requestType = requestType;

  const requests = await PendingRequest.find(filter)
    .populate("requestedBy", "firstName lastName email avatarUrl")
    .populate("placeId", "name slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json(requests);
});

// GET /pendingRequests/:id
exports.getPendingRequestById = asyncHandler(async (req, res) => {
  const request = await PendingRequest.findById(req.params.id)
    .populate("requestedBy", "firstName lastName email")
    .populate("placeId", "name slug");

  if (!request) throw new ApiError(404, "Demande introuvable");
  res.json(request);
});

// POST /pendingRequests
exports.submitPendingRequest = asyncHandler(async (req, res) => {
  const request = await PendingRequest.create({ ...req.body, requestedBy: req.user._id });
  res.status(201).json(request);
});

// PATCH /pendingRequests/:id/approve
exports.approvePendingRequest = asyncHandler(async (req, res) => {
  const request = await PendingRequest.findByIdAndUpdate(
    req.params.id,
    { status: "approved", reviewedBy: req.user._id },
    { new: true }
  );
  if (!request) throw new ApiError(404, "Demande introuvable");
  res.json(request);
});

// PATCH /pendingRequests/:id/reject
exports.rejectPendingRequest = asyncHandler(async (req, res) => {
  const request = await PendingRequest.findByIdAndUpdate(
    req.params.id,
    { status: "rejected", reviewedBy: req.user._id, payload: req.body },
    { new: true }
  );
  if (!request) throw new ApiError(404, "Demande introuvable");
  res.json(request);
});

// ─── Admin Logs ───────────────────────────────────────────────────────────────

// GET /adminLogs
exports.getAdminLogs = asyncHandler(async (req, res) => {
  const { targetType, targetId, action, ...rest } = req.query;
  const { skip, limit } = getPagination(rest);

  const filter = {};
  if (targetType) filter.targetType = targetType;
  if (targetId)   filter.targetId   = targetId;
  if (action)     filter.action     = action;

  const logs = await AdminLog.find(filter)
    .populate("adminId", "firstName lastName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json(logs);
});

// POST /adminLogs
exports.createAdminLog = asyncHandler(async (req, res) => {
  const log = await AdminLog.create({ ...req.body, adminId: req.user._id });
  res.status(201).json(log);
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

// GET /admin/stats
exports.getStats = asyncHandler(async (req, res) => {
  const [users, places, events, guides, pendingRequests, comments, reports] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Place.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "upcoming" }),
    GuideProfile.countDocuments({ verificationStatus: "verified" }),
    PendingRequest.countDocuments({ status: "pending" }),
    Comment.countDocuments({ status: "active" }),
    Report.countDocuments({ status: "open" }),
  ]);

  res.json({ users, places, events, guides, pendingRequests, comments, reports });
});

// ─── Admin Comment Moderation ─────────────────────────────────────────────────

// GET /admin/comments
exports.getAllComments = asyncHandler(async (req, res) => {
  const { targetType, status, search, ...rest } = req.query;
  const { skip, limit } = getPagination(rest);

  const filter = {};
  if (targetType) filter.targetType = targetType;
  if (status)     filter.status     = status;
  else            filter.status     = { $in: ["active", "deleted", "flagged"] };
  if (search)     filter.content    = { $regex: search, $options: "i" };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate("authorId", "firstName lastName email avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Comment.countDocuments(filter),
  ]);

  res.json({ comments, total });
});

// ─── Admin User Status ────────────────────────────────────────────────────────

// PATCH /admin/users/:id/status
exports.setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") throw new ApiError(400, "isActive must be a boolean");
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) throw new ApiError(404, "User not found");
  res.json(user);
});

// GET /admin/analytics
exports.getAnalytics = asyncHandler(async (req, res) => {
  const now   = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1); // last 6 months

  const monthLabel = (y, m) => {
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
  };

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

  const [
    monthlyUsers,
    monthlyEvents,
    placesByCat,
    placesByCity,
    userRoles,
    totalFeaturedPlaces,
    totalFeaturedEvents,
  ] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Event.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
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

  res.json({
    monthlyUsers:  fillMonths(monthlyUsers),
    monthlyEvents: fillMonths(monthlyEvents),
    placesByCategory: placesByCat.map((p) => ({ name: p.name, icon: p.icon, value: p.count })),
    placesByCity:     placesByCity.map((p) => ({ city: p.name, places: p.count })),
    userRoles:        userRoles.map((r) => ({ role: r.role || "unknown", count: r.count })),
    featuredPlaces:   totalFeaturedPlaces,
    featuredEvents:   totalFeaturedEvents,
  });
});

// GET /admin/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
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
  res.json({ stats: { users, places, events, guides }, recentLogs, recentRequests });
});
