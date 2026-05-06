const { Schema, model, Types } = require("mongoose");

const adminLogSchema = new Schema(
  {
    adminId:    { type: Types.ObjectId, ref: "User",  required: true },
    action:     { type: String, required: true },
    targetType: { type: String, required: true },
    targetId:   { type: Types.ObjectId, required: true },
    metadata:   { type: Schema.Types.Mixed, default: {} },
    createdAt:  { type: Date, default: Date.now },
  },
  { timestamps: false }
);

adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ targetType: 1, targetId: 1 });
adminLogSchema.index({ action: 1, createdAt: -1 });

module.exports = model("AdminLog", adminLogSchema);
