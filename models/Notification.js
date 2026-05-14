const { Schema, model, Types } = require("mongoose");

const NOTIFICATION_TYPES = [
  "SYSTEM_BROADCAST",
  "BOOKING",
  "MESSAGE",
  "REVIEW",
  "EVENT",
  "GUIDE",
  "COMMUNITY",
];

const notificationSchema = new Schema(
  {
    userId:     { type: Types.ObjectId, ref: "User", required: true },
    senderId:   { type: Types.ObjectId, ref: "User", default: null },
    senderName: { type: String, default: "City Guide", trim: true },
    title:      { type: String, required: true, trim: true },
    message:    { type: String, required: true, trim: true },
    type:       { type: String, enum: NOTIFICATION_TYPES, default: "SYSTEM_BROADCAST" },
    isRead:     { type: Boolean, default: false },
    link:       { type: String, default: "" },
    entityId:   { type: Types.ObjectId, default: null },
    entityType: {
      type: String,
      enum: ["place", "guide", "event", "review", "booking", "user", "system"],
      default: "system",
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
