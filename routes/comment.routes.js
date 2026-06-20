const router = require("express").Router();
const ctrl   = require("../controllers/comment.controller");
const { protect, optionalProtect, restrict } = require("../middlewares/auth.middleware");

// optionalProtect: anonymous reads work, but a logged-in reader also gets the
// per-comment `likedByMe` flag so the like button can reflect/toggle state.
router.get   ("/",    optionalProtect, ctrl.getComments);
router.post  ("/",    protect, ctrl.postComment);
router.put   ("/:id", protect, ctrl.updateComment);
router.delete("/:id", protect, ctrl.deleteComment);
router.patch ("/:id", protect, ctrl.toggleLike);

module.exports = router;
