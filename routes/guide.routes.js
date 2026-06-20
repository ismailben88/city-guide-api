const router = require("express").Router();
const ctrl   = require("../controllers/guide.controller");
const { protect, optionalProtect, restrict } = require("../middlewares/auth.middleware");

router.get("/nearby", ctrl.getNearbyGuides);

router.get   ("/",                   optionalProtect, ctrl.getGuides);
router.get   ("/:id",                ctrl.getGuideById);
router.post  ("/",                   protect, ctrl.createGuideProfile);
router.put   ("/:id",                protect, ctrl.updateGuideProfile);
router.delete("/:id",                protect, restrict("admin"), ctrl.deleteGuideProfile);
router.delete("/:id/self",           protect, ctrl.selfDeleteGuideProfile);
router.patch ("/:id/pause",          protect, ctrl.pauseGuide);
router.patch ("/:id/resume",         protect, ctrl.resumeGuide);
router.put   ("/:id/availability",   protect, ctrl.updateAvailability);
router.post  ("/:id/verify-documents", protect, ctrl.submitVerificationDocuments);
router.patch ("/:id/certified",        protect, restrict("admin"), ctrl.toggleCertified);
router.patch ("/:id/publish",          protect, restrict("admin"), ctrl.togglePublish);
router.patch ("/:id/verify",           protect, restrict("admin"), ctrl.verifyGuideProfile);

module.exports = router;
