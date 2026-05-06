const router = require("express").Router();
const ctrl   = require("../controllers/notification.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");

// read-all AVANT /:id pour éviter le conflit de paramètre
router.patch ("/read-all",   protect, ctrl.markAllAsRead);
router.delete("/",           protect, ctrl.deleteReadNotifications);

router.get   ("/",    protect, ctrl.getNotifications);
router.post  ("/",    protect, restrict("admin"), ctrl.createNotification);
router.patch ("/:id", protect, ctrl.markAsRead);
router.delete("/:id", protect, ctrl.deleteNotification);

module.exports = router;
