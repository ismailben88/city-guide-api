const asyncHandler   = require("../utils/asyncHandler");
const ApiError       = require("../utils/ApiError");
const AdminLog       = require("../models/AdminLog");
const PendingRequest = require("../models/PendingRequest");
const Place          = require("../models/Place");
const GuideProfile   = require("../models/GuideProfile");
const User           = require("../models/User");
const Event          = require("../models/Event");
const Comment        = require("../models/Comment");
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
  const [users, places, events, guides, pendingRequests, comments] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Place.countDocuments({ status: "active" }),
    Event.countDocuments({ status: "upcoming" }),
    GuideProfile.countDocuments({ verificationStatus: "verified" }),
    PendingRequest.countDocuments({ status: "pending" }),
    Comment.countDocuments({ status: "active" }),
  ]);

  res.json({ users, places, events, guides, pendingRequests, comments });
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
