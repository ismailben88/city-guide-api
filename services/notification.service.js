const Notification = require("../models/Notification");
const ApiError     = require("../utils/ApiError");

const getByUser = async (userId) =>
  Notification.find({ userId }).sort({ createdAt: -1 });

const create = async (data) => Notification.create(data);

const markAsRead = async (id) => {
  const notif = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
  if (!notif) throw new ApiError(404, "Notification introuvable");
  return notif;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};

const remove = async (id) => {
  await Notification.findByIdAndDelete(id);
};

const removeRead = async (userId) => {
  await Notification.deleteMany({ userId, isRead: true });
};

module.exports = { getByUser, create, markAsRead, markAllAsRead, remove, removeRead };
