const router = require("express").Router();
const ctrl   = require("../controllers/user.controller");
const { protect, restrict } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get   ("/",                            protect, restrict("admin"), ctrl.getUsers);
router.get   ("/:id",                         protect, ctrl.getUserById);
router.put   ("/:id",                         protect, ctrl.updateUser);
router.delete("/:id",                         protect, restrict("admin"), ctrl.deleteUser);
router.post  ("/:id/avatar",                  protect, upload.single("avatar"), ctrl.uploadAvatar);
router.post  ("/:id/linked-accounts",         protect, ctrl.addLinkedAccount);
router.delete("/:id/linked-accounts/:provider", protect, ctrl.removeLinkedAccount);

module.exports = router;
