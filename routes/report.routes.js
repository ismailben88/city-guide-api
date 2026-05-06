const router = require("express").Router();
const ctrl   = require("../controllers/report.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");

router.get   ("/",             protect, restrict("admin"), ctrl.getReports);
router.post  ("/",             protect, ctrl.submitReport);
router.patch ("/:id/review",   protect, restrict("admin"), ctrl.reviewReport);
router.patch ("/:id/resolve",  protect, restrict("admin"), ctrl.resolveReport);

module.exports = router;
