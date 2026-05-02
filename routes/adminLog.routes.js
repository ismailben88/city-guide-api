// Alias direct vers les routes /admin/adminLogs
// Le frontend appelle /adminLogs sans le préfixe /admin
const router = require("express").Router();
const ctrl   = require("../controllers/admin.controller");
const { protect, restrict } = require("../middleware/auth");

const isAdmin = [protect, restrict("admin")];

router.get ("/"   , ...isAdmin, ctrl.getAdminLogs);
router.post("/"   , ...isAdmin, ctrl.createAdminLog);

module.exports = router;
