const router = require("express").Router();
const contactController = require("../controllers/contact.controller");

router.post("/", contactController.sendMessage);

module.exports = router;
