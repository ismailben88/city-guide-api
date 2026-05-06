const router = require("express").Router();
const ctrl   = require("../controllers/favorite.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get   ("/",    protect, ctrl.getFavorites);
router.post  ("/",    protect, ctrl.addFavorite);
router.delete("/:id", protect, ctrl.deleteFavorite);

module.exports = router;
