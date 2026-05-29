// Alias direct vers les routes /admin/pendingRequests
// Le frontend appelle /pendingRequests sans le préfixe /admin
const router = require("express").Router();
const ctrl   = require("../controllers/admin.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");

const isAdmin = [protect, restrict("admin")];

router.get   ("/mine",         protect,    ctrl.getMyPendingRequests);
router.get   ("/",            ...isAdmin, ctrl.getPendingRequests);
router.get   ("/:id",         ...isAdmin, ctrl.getPendingRequestById);
router.post  ("/",            protect,    ctrl.submitPendingRequest);
router.patch ("/:id/approve", ...isAdmin, ctrl.approvePendingRequest);
router.patch ("/:id/reject",  ...isAdmin, ctrl.rejectPendingRequest);

module.exports = router;
