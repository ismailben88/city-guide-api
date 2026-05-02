const router = require("express").Router();
const ctrl   = require("../controllers/category.controller");
const { protect, restrict } = require("../middleware/auth");

router.get   ("/",    ctrl.getCategories);
router.get   ("/:id", ctrl.getCategoryById);
router.post  ("/",    protect, restrict("admin"), ctrl.createCategory);
router.put   ("/:id", protect, restrict("admin"), ctrl.updateCategory);
router.delete("/:id", protect, restrict("admin"), ctrl.deleteCategory);

module.exports = router;
