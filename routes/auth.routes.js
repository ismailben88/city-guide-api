const router  = require("express").Router();
const ctrl    = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/security.middleware");

// Throttle credential-bearing endpoints against brute-force / stuffing.
router.post("/register",  authLimiter, ctrl.register);
router.post("/login",     authLimiter, ctrl.login);
router.post("/google",    authLimiter, ctrl.googleAuth);
router.post("/facebook",  authLimiter, ctrl.facebookAuth);
router.post("/logout",    ctrl.logout);
router.post("/refresh",   authLimiter, ctrl.refreshToken);
router.get ("/me",        protect, ctrl.getMe);

module.exports = router;
