const router = require("express").Router();
const ctrl   = require("../controllers/guide.controller");
const { protect, restrict } = require("../middleware/auth");

router.get("/nearby", ctrl.getNearbyGuides);

router.get   ("/",                   ctrl.getGuides);
router.get   ("/:id",                ctrl.getGuideById);
router.post  ("/",                   protect, ctrl.createGuideProfile);
router.put   ("/:id",                protect, ctrl.updateGuideProfile);
router.delete("/:id",                protect, restrict("admin"), ctrl.deleteGuideProfile);
router.put   ("/:id/availability",   protect, ctrl.updateAvailability);

module.exports = router;
