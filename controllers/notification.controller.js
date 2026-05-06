const asyncHandler          = require("../utils/asyncHandler");
const notificationService   = require("../services/notification.service");

// GET /notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getByUser(req.user._id);
  res.json(notifications);
});

// POST /notifications
exports.createNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.create(req.body);
  res.status(201).json(notification);
});

// PATCH /notifications/:id — marquer comme lue
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id);
  res.json(notification);
});

// PATCH /notifications/read-all — marquer toutes comme lues
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);
  res.json({ message: "Toutes les notifications marquées comme lues" });
});

// DELETE /notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.remove(req.params.id);
  res.json({ message: "Notification supprimée" });
});

// DELETE /notifications — supprimer les lues
exports.deleteReadNotifications = asyncHandler(async (req, res) => {
  await notificationService.removeRead(req.user._id);
  res.json({ message: "Notifications lues supprimées" });
});
