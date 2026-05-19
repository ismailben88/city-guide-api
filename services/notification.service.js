const Notification = require("../models/Notification");
const ApiError     = require("../utils/ApiError");
const { getIO }    = require("../utils/socket");

const getByUser = async (userId) =>
  Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);

const getUnreadCount = async (userId) =>
  Notification.countDocuments({ userId, isRead: false });

const create = async (data) => Notification.create(data);

// Create in DB then emit in real-time to the recipient's socket room
const createAndEmit = async (data) => {
  const notif = await Notification.create(data);
  const io = getIO();
  if (io) {
    io.to(`user:${data.userId}`).emit("notification:new", notif.toObject());
  }
  return notif;
};

const markAsRead = async (id, userId) => {
  const query = userId ? { _id: id, userId } : { _id: id };
  const notif = await Notification.findOneAndUpdate(query, { isRead: true }, { new: true });
  if (!notif) throw new ApiError(404, "Notification introuvable ou non autorisée");
  return notif;
};

const markAllAsRead = async (userId) =>
  Notification.updateMany({ userId, isRead: false }, { isRead: true });

const remove = async (id, userId) => {
  const query = userId ? { _id: id, userId } : { _id: id };
  const notif = await Notification.findOneAndDelete(query);
  if (!notif) throw new ApiError(404, "Notification introuvable ou non autorisée");
  return notif;
};

const removeRead = async (userId) =>
  Notification.deleteMany({ userId, isRead: true });

module.exports = {
  getByUser,
  getUnreadCount,
  create,
  createAndEmit,
  markAsRead,
  markAllAsRead,
  remove,
  removeRead,
};
