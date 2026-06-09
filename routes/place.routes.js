const router    = require("express").Router();
const ctrl      = require("../controllers/place.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");
const upload    = require("../middlewares/upload.middleware");
const lang      = require("../middlewares/lang.middleware");
const translate = require("../middlewares/translateResponse.middleware");

// Routes spécifiques AVANT /:id pour éviter les conflits
router.get("/search",  lang, translate, ctrl.searchPlaces);
router.get("/nearby",  lang, translate, ctrl.getNearbyPlaces);
router.get("/top",          lang, translate, ctrl.getTopPlaces);
router.get("/top-per-city", lang, translate, ctrl.getTopPerCity);
router.get("/markers",      lang, translate, ctrl.getPlaceMarkers);

router.get   ("/",           lang, translate, ctrl.getPlaces);
router.get   ("/:id",        lang, translate, ctrl.getPlaceById);
router.post  ("/",           protect, ctrl.createPlace);
router.put   ("/:id",        protect, ctrl.updatePlace);
router.delete("/:id/permanent", protect, restrict("admin"), ctrl.permanentDeletePlace);
router.delete("/:id",          protect, restrict("admin", "entrepreneur"), ctrl.deletePlace);
router.patch ("/:id/feature", protect, restrict("admin"), ctrl.toggleFeature);
router.post  ("/:id/media",  protect, upload.single("file"), ctrl.uploadMedia);
router.post  ("/:id/claim",  protect, ctrl.claimBusiness);

module.exports = router;
