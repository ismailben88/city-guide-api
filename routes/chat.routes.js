const router = require("express").Router();
const chatController = require("../controllers/chat.controller");

router.post("/message", chatController.sendMessage);

module.exports = router;
