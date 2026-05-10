const router = require("express").Router();

router.use("/auth",           require("./auth.routes"));
router.use("/users",          require("./user.routes"));
router.use("/cities",         require("./city.routes"));
router.use("/categories",     require("./category.routes"));
router.use("/places",         require("./place.routes"));
router.use("/events",         require("./event.routes"));
router.use("/scores",         require("./score.routes"));
router.use("/comments",       require("./comment.routes"));
router.use("/favorites",      require("./favorite.routes"));
router.use("/media",          require("./media.routes"));
router.use("/reports",        require("./report.routes"));
router.use("/notifications",  require("./notification.routes"));
router.use("/businesses",     require("./business.routes"));
router.use("/pendingRequests",require("./pendingRequest.routes"));
router.use("/adminLogs",      require("./adminLog.routes"));
router.use("/admin",          require("./admin.routes"));

router.use("/chat",           require("./chat.routes"));

// Alias — le frontend appelle /guideProfiles et /guides
const guideRouter = require("./guide.routes");
router.use("/guides",        guideRouter);
router.use("/guideProfiles", guideRouter);

module.exports = router;
