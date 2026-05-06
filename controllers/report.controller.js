const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Report       = require("../models/Report");
const { getPagination } = require("../utils/pagination.utils");

// GET /reports  (admin)
exports.getReports = asyncHandler(async (req, res) => {
  const { status, targetType, ...rest } = req.query;
  const { skip, limit, page } = getPagination(rest);

  const filter = {};
  if (status)     filter.status     = status;
  if (targetType) filter.targetType = targetType;

  const reports = await Report.find(filter)
    .populate("reportedBy", "firstName lastName email")
    .populate("reviewedBy", "firstName lastName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json(reports);
});

// POST /reports
exports.submitReport = asyncHandler(async (req, res) => {
  const report = await Report.create({ ...req.body, reportedBy: req.user._id });
  res.status(201).json(report);
});

// PATCH /reports/:id/review  (admin)
exports.reviewReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: "reviewed", reviewedBy: req.user._id },
    { new: true }
  );
  if (!report) throw new ApiError(404, "Signalement introuvable");
  res.json(report);
});

// PATCH /reports/:id/resolve  (admin)
exports.resolveReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: "resolved", reviewedBy: req.user._id, note: req.body.resolution },
    { new: true }
  );
  if (!report) throw new ApiError(404, "Signalement introuvable");
  res.json(report);
});
