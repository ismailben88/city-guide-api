const Report = require("../model/Report");

// GET /reports  (admin)
exports.getReports = async (req, res, next) => {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;

    const reports = await Report.find(filter)
      .populate("reportedBy", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(reports);
  } catch (err) { next(err); }
};

// POST /reports
exports.submitReport = async (req, res, next) => {
  try {
    const report = await Report.create({
      ...req.body,
      reportedBy: req.user._id,
    });
    res.status(201).json(report);
  } catch (err) { next(err); }
};

// PATCH /reports/:id/review  (admin)
exports.reviewReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "reviewed", reviewedBy: req.user._id },
      { new: true }
    );
    res.json(report);
  } catch (err) { next(err); }
};

// PATCH /reports/:id/resolve  (admin)
exports.resolveReport = async (req, res, next) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: "resolved", reviewedBy: req.user._id, note: req.body.resolution },
      { new: true }
    );
    res.json(report);
  } catch (err) { next(err); }
};
