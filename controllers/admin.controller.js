const AdminLog       = require("../model/AdminLog");
const PendingRequest = require("../model/PendingRequest");
const Place          = require("../model/Place");
const GuideProfile   = require("../model/GuideProfile");
const User           = require("../model/User");
const Event          = require("../model/Event");
const Comment        = require("../model/Comment");

// ─── Pending Requests ────────────────────────────────────────────────────────

// GET /pendingRequests
exports.getPendingRequests = async (req, res, next) => {
  try {
    const { requestType, status = "pending", page = 1, limit = 20 } = req.query;
    const filter = { status };
    if (requestType) filter.requestType = requestType;

    const requests = await PendingRequest.find(filter)
      .populate("requestedBy", "firstName lastName email avatarUrl")
      .populate("placeId", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(requests);
  } catch (err) { next(err); }
};

// GET /pendingRequests/:id
exports.getPendingRequestById = async (req, res, next) => {
  try {
    const request = await PendingRequest.findById(req.params.id)
      .populate("requestedBy", "firstName lastName email")
      .populate("placeId", "name slug");

    if (!request) return res.status(404).json({ message: "Demande introuvable" });
    res.json(request);
  } catch (err) { next(err); }
};

// POST /pendingRequests
exports.submitPendingRequest = async (req, res, next) => {
  try {
    const request = await PendingRequest.create({
      ...req.body,
      requestedBy: req.user._id,
    });
    res.status(201).json(request);
  } catch (err) { next(err); }
};

// PATCH /pendingRequests/:id/approve
exports.approvePendingRequest = async (req, res, next) => {
  try {
    const request = await PendingRequest.findByIdAndUpdate(
      req.params.id,
      { status: "approved", reviewedBy: req.user._id },
      { new: true }
    );
    // Les side-effects (isVerifiedBusiness, isGuide…) sont gérés par le hook
    // post("findOneAndUpdate") dans schemas.js
    res.json(request);
  } catch (err) { next(err); }
};

// PATCH /pendingRequests/:id/reject
exports.rejectPendingRequest = async (req, res, next) => {
  try {
    const request = await PendingRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        reviewedBy: req.user._id,
        payload: { ...req.body },
      },
      { new: true }
    );
    res.json(request);
  } catch (err) { next(err); }
};

// ─── Admin Logs ───────────────────────────────────────────────────────────────

// GET /adminLogs
exports.getAdminLogs = async (req, res, next) => {
  try {
    const { targetType, targetId, action, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;
    if (action) filter.action = action;

    const logs = await AdminLog.find(filter)
      .populate("adminId", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(logs);
  } catch (err) { next(err); }
};

// POST /adminLogs
exports.createAdminLog = async (req, res, next) => {
  try {
    const log = await AdminLog.create({ ...req.body, adminId: req.user._id });
    res.status(201).json(log);
  } catch (err) { next(err); }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

// GET /admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [users, places, events, guides, pendingRequests, comments] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Place.countDocuments({ status: "active" }),
      Event.countDocuments({ status: "upcoming" }),
      GuideProfile.countDocuments({ verificationStatus: "verified" }),
      PendingRequest.countDocuments({ status: "pending" }),
      Comment.countDocuments({ status: "active" }),
    ]);

    res.json({ users, places, events, guides, pendingRequests, comments });
  } catch (err) { next(err); }
};

// GET /admin/dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const [stats, recentLogs, recentRequests] = await Promise.all([
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

    const [users, places, events, guides] = stats;
    res.json({ stats: { users, places, events, guides }, recentLogs, recentRequests });
  } catch (err) { next(err); }
};
