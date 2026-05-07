const router = require("express").Router();
const ctrl   = require("../controllers/user.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// ── Self-service /me routes (must be BEFORE /:id to avoid param capture) ──────
router.patch ("/me/password",                 protect, ctrl.changeMyPassword);
router.delete("/me",                          protect, ctrl.deleteMyAccount);

router.get   ("/",                            protect, restrict("admin"), ctrl.getUsers);
router.get   ("/:id",                         protect, ctrl.getUserById);
router.put   ("/:id",                         protect, ctrl.updateUser);
router.patch ("/:id/role",                    protect, restrict("admin"), ctrl.updateRole);
router.delete("/:id",                         protect, restrict("admin"), ctrl.deleteUser);
router.post  ("/:id/avatar",                  protect, upload.single("avatar"), ctrl.uploadAvatar);
router.post  ("/:id/linked-accounts",         protect, ctrl.addLinkedAccount);
router.delete("/:id/linked-accounts/:provider", protect, ctrl.removeLinkedAccount);

module.exports = router;
