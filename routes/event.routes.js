const router    = require("express").Router();
const ctrl      = require("../controllers/event.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");
const lang      = require("../middlewares/lang.middleware");
const translate = require("../middlewares/translateResponse.middleware");

router.get("/nearby", lang, translate, ctrl.getNearbyEvents);

router.get   ("/",            lang, translate, ctrl.getEvents);
router.get   ("/:id",         lang, translate, ctrl.getEventById);
router.post  ("/",            protect, restrict("admin"), ctrl.createEvent);
router.put   ("/:id",         protect, restrict("admin"), ctrl.updateEvent);
router.delete("/:id",         protect, restrict("admin"), ctrl.deleteEvent);
router.patch ("/:id/feature", protect, restrict("admin"), ctrl.toggleFeature);

module.exports = router;
