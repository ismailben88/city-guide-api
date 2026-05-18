const router      = require("express").Router();
const rateLimit   = require("express-rate-limit");
const chatController = require("../controllers/chat.controller");

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,              // 20 messages par minute par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de requêtes. Réessayez dans une minute." },
});

router.post("/message", chatLimiter, chatController.sendMessage);

module.exports = router;
