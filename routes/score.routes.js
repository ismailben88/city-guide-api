const router = require("express").Router();
const ctrl   = require("../controllers/score.controller");
const { protect, restrict } = require("../middleware/auth");

router.get   ("/",          ctrl.getScores);
router.get   ("/analytics", ctrl.getAnalytics);
router.post  ("/",          protect, ctrl.submitScore);
router.delete("/:id",       protect, restrict("admin"), ctrl.deleteScore);

module.exports = router;
