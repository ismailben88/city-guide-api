const Notification = require("../model/Notification");

// GET /notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) { next(err); }
};

// POST /notifications
exports.createNotification = async (req, res, next) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (err) { next(err); }
};

// PATCH /notifications/:id  — marquer comme lu
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) { next(err); }
};

// PATCH /notifications/read-all  — marquer toutes comme lues
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ message: "Toutes les notifications marquées comme lues" });
  } catch (err) { next(err); }
};

// DELETE /notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification supprimée" });
  } catch (err) { next(err); }
};

// DELETE /notifications — supprimer les lues
exports.deleteReadNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.deleteMany({ userId, isRead: true });
    res.json({ message: "Notifications lues supprimées" });
  } catch (err) { next(err); }
};
