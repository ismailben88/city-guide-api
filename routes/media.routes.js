const router = require("express").Router();
const ctrl   = require("../controllers/media.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.get   ("/",             ctrl.getMedia);
router.post  ("/",             protect, upload.single("file"), ctrl.uploadMedia);
router.patch ("/:id/approve",  protect, restrict("admin"), ctrl.approveMedia);
router.patch ("/:id/reject",   protect, restrict("admin"), ctrl.rejectMedia);
router.delete("/:id",          protect, restrict("admin"), ctrl.deleteMedia);

module.exports = router;
