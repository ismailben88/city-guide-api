const router    = require("express").Router();
const ctrl      = require("../controllers/category.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");
const lang      = require("../middlewares/lang.middleware");
const translate = require("../middlewares/translateResponse.middleware");

router.get   ("/",    lang, translate, ctrl.getCategories);
router.get   ("/:id", lang, translate, ctrl.getCategoryById);
router.post  ("/",    protect, restrict("admin"), ctrl.createCategory);
router.put   ("/:id", protect, restrict("admin"), ctrl.updateCategory);
router.delete("/:id", protect, restrict("admin"), ctrl.deleteCategory);

module.exports = router;
