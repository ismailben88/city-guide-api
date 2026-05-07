const router = require("express").Router();
const ctrl   = require("../controllers/admin.controller");
const { protect, restrict } = require("../middlewares/auth.middleware");

const isAdmin = [protect, restrict("admin")];

// Pending Requests
router.get   ("/pendingRequests",            ...isAdmin, ctrl.getPendingRequests);
router.get   ("/pendingRequests/:id",        ...isAdmin, ctrl.getPendingRequestById);
router.post  ("/pendingRequests",            protect,    ctrl.submitPendingRequest);
router.patch ("/pendingRequests/:id/approve",...isAdmin, ctrl.approvePendingRequest);
router.patch ("/pendingRequests/:id/reject", ...isAdmin, ctrl.rejectPendingRequest);

// Admin Logs
router.get   ("/adminLogs",  ...isAdmin, ctrl.getAdminLogs);
router.post  ("/adminLogs",  ...isAdmin, ctrl.createAdminLog);

// Dashboard
router.get   ("/stats",      ...isAdmin, ctrl.getStats);
router.get   ("/dashboard",  ...isAdmin, ctrl.getDashboard);
router.get   ("/analytics",  ...isAdmin, ctrl.getAnalytics);

module.exports = router;
