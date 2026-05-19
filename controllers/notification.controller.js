const asyncHandler        = require("../utils/asyncHandler");
const notificationService = require("../services/notification.service");

// GET /notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getByUser(req.user._id);
  res.json(notifications);
});

// GET /notifications/count — unread badge count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ count });
});

// POST /notifications — admin only
exports.createNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.createAndEmit(req.body);
  res.status(201).json(notification);
});

// PATCH /notifications/:id — mark one as read (ownership enforced in service)
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user._id);
  res.json(notification);
});

// PATCH /notifications/read-all — mark all as read
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);
  res.json({ message: "Toutes les notifications marquées comme lues" });
});

// DELETE /notifications/:id (ownership enforced in service)
exports.deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.remove(req.params.id, req.user._id);
  res.json({ message: "Notification supprimée" });
});

// DELETE /notifications — delete all read
exports.deleteReadNotifications = asyncHandler(async (req, res) => {
  await notificationService.removeRead(req.user._id);
  res.json({ message: "Notifications lues supprimées" });
});
