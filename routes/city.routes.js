const router    = require("express").Router();
const ctrl      = require("../controllers/city.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");
const lang      = require("../middlewares/lang.middleware");
const translate = require("../middlewares/translateResponse.middleware");

router.get   ("/with-counts", lang, translate, ctrl.getCitiesWithCounts);
router.get   ("/",    lang, translate, ctrl.getCities);
router.get   ("/:id", lang, translate, ctrl.getCityById);
router.post  ("/",    protect, restrict("admin"), ctrl.createCity);
router.put   ("/:id", protect, restrict("admin"), ctrl.updateCity);
router.delete("/:id", protect, restrict("admin"), ctrl.deleteCity);

module.exports = router;
