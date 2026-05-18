const asyncHandler   = require("../utils/asyncHandler");
const ApiError       = require("../utils/ApiError");
const adminService   = require("../services/admin.service");
const AdminLog       = require("../models/AdminLog");
const PendingRequest = require("../models/PendingRequest");
const User           = require("../models/User");
const Comment        = require("../models/Comment");

// ─── Pending Requests ─────────────────────────────────────────────────────────

// GET /pendingRequests
exports.getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await adminService.getPendingRequests(req.query);
  res.json(requests);
});

// GET /pendingRequests/:id
exports.getPendingRequestById = asyncHandler(async (req, res) => {
  const request = await adminService.getPendingRequestById(req.params.id);
  res.json(request);
});

// POST /pendingRequests
exports.submitPendingRequest = asyncHandler(async (req, res) => {
  const request = await PendingRequest.create({ ...req.body, requestedBy: req.user._id });
  res.status(201).json(request);
});

// PATCH /pendingRequests/:id/approve
exports.approvePendingRequest = asyncHandler(async (req, res) => {
  const request = await adminService.approvePendingRequest(req.params.id, req.user._id);
  res.json(request);
});

// PATCH /pendingRequests/:id/reject
exports.rejectPendingRequest = asyncHandler(async (req, res) => {
  const request = await adminService.rejectPendingRequest(req.params.id, req.user._id, req.body.reason);
  res.json(request);
});

// ─── Admin Logs ───────────────────────────────────────────────────────────────

// GET /adminLogs
exports.getAdminLogs = asyncHandler(async (req, res) => {
  const logs = await adminService.getAdminLogs(req.query);
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
  const stats = await adminService.getStats();
  res.json(stats);
});

// GET /admin/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboard();
  res.json(data);
});

// GET /admin/analytics
exports.getAnalytics = asyncHandler(async (req, res) => {
  const data = await adminService.getAnalytics();
  res.json(data);
});

// ─── Comment Moderation ───────────────────────────────────────────────────────

// GET /admin/comments
exports.getAllComments = asyncHandler(async (req, res) => {
  const result = await adminService.getAllComments(req.query);
  res.json(result);
});

// DELETE /admin/comments/:id
exports.softDeleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(req.params.id, { status: "deleted" }, { new: true });
  if (!comment) throw new ApiError(404, "Commentaire introuvable");
  res.json(comment);
});

// PATCH /admin/comments/:id/restore
exports.restoreComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
  if (!comment) throw new ApiError(404, "Commentaire introuvable");
  res.json(comment);
});

// ─── User Management ─────────────────────────────────────────────────────────

// PATCH /admin/users/:id/status
exports.setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") throw new ApiError(400, "isActive doit être un booléen");
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
  if (!user) throw new ApiError(404, "Utilisateur introuvable");
  res.json(user);
});
