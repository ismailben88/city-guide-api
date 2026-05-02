const router = require("express").Router();
const ctrl   = require("../controllers/place.controller");
const { protect, restrict } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Routes spécifiques AVANT /:id pour éviter les conflits
router.get("/search",  ctrl.searchPlaces);
router.get("/nearby",  ctrl.getNearbyPlaces);
router.get("/top",     ctrl.getTopPlaces);

router.get   ("/",           ctrl.getPlaces);
router.get   ("/:id",        ctrl.getPlaceById);
router.post  ("/",           protect, ctrl.createPlace);
router.put   ("/:id",        protect, ctrl.updatePlace);
router.delete("/:id",        protect, restrict("admin", "entrepreneur"), ctrl.deletePlace);
router.patch ("/:id/feature", protect, restrict("admin"), ctrl.toggleFeature);
router.post  ("/:id/media",  protect, upload.single("file"), ctrl.uploadMedia);
router.post  ("/:id/claim",  protect, ctrl.claimBusiness);

module.exports = router;
