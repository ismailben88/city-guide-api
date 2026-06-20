const asyncHandler = require("../utils/asyncHandler");
const PageView     = require("../models/PageView");

exports.trackPageView = asyncHandler(async (req, res) => {
  const { path, sessionId } = req.body ?? {};

  if (!path || typeof path !== "string" || !sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "path and sessionId are required" });
  }

  await PageView.create({
    path:      path.slice(0, 500),
    sessionId: sessionId.slice(0, 128),
    userId:    req.user?._id ?? null,
  });

  res.json({ ok: true });
});
