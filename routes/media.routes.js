const router = require("express").Router();
const ctrl   = require("../controllers/media.controller");
const { protect, restrict } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get   ("/",             ctrl.getMedia);
router.post  ("/",             protect, upload.single("file"), ctrl.uploadMedia);
router.patch ("/:id/approve",  protect, restrict("admin"), ctrl.approveMedia);
router.delete("/:id",          protect, restrict("admin"), ctrl.deleteMedia);

module.exports = router;
