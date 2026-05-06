const router = require("express").Router();
const ctrl   = require("../controllers/event.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");

router.get("/nearby", ctrl.getNearbyEvents);

router.get   ("/",            ctrl.getEvents);
router.get   ("/:id",         ctrl.getEventById);
router.post  ("/",            protect, restrict("admin"), ctrl.createEvent);
router.put   ("/:id",         protect, restrict("admin"), ctrl.updateEvent);
router.delete("/:id",         protect, restrict("admin"), ctrl.deleteEvent);
router.patch ("/:id/feature", protect, restrict("admin"), ctrl.toggleFeature);

module.exports = router;
