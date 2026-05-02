const router = require("express").Router();
const ctrl   = require("../controllers/comment.controller");
const { protect, restrict } = require("../middleware/auth");

router.get   ("/",    ctrl.getComments);
router.post  ("/",    protect, ctrl.postComment);
router.put   ("/:id", protect, ctrl.updateComment);
router.delete("/:id", protect, ctrl.deleteComment);
router.patch ("/:id", protect, ctrl.toggleLike);

module.exports = router;
