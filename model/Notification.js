const { Schema, model, Types } = require("mongoose");

const notificationSchema = new Schema(
  {
    userId:  { type: Types.ObjectId, ref: "User", required: true },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type:    { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
    isRead:  { type: Boolean, default: false },
    link:    { type: String, default: "" },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = model("Notification", notificationSchema);
