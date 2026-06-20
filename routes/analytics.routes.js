const router = require("express").Router();
const ctrl   = require("../controllers/analytics.controller");

// Public — no auth required; userId defaults to null for anonymous visitors
router.post("/pageview", ctrl.trackPageView);

module.exports = router;
