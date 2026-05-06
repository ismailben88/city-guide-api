const router = require("express").Router();
const ctrl   = require("../controllers/city.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");

router.get   ("/",    ctrl.getCities);
router.get   ("/:id", ctrl.getCityById);
router.post  ("/",    protect, restrict("admin"), ctrl.createCity);
router.put   ("/:id", protect, restrict("admin"), ctrl.updateCity);
router.delete("/:id", protect, restrict("admin"), ctrl.deleteCity);

module.exports = router;
