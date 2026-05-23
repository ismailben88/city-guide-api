const { Schema, model, Types } = require("mongoose");

const pendingRequestSchema = new Schema(
  {
    requestType: {
      type:     String,
      required: true,
      enum:     ["guide_application", "guide_verification", "business_verification"],
    },
    requestedBy: { type: Types.ObjectId, ref: "User",  required: true },
    placeId:     { type: Types.ObjectId, ref: "Place", default: null },
    payload:     { type: Schema.Types.Mixed, default: {} },
    status:      { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy:  { type: Types.ObjectId, ref: "User", default: null },
    reason:      { type: String, default: "" },
  },
  { timestamps: true }
);

pendingRequestSchema.index({ requestType: 1, status: 1 });
pendingRequestSchema.index({ requestedBy: 1 });

module.exports = model("PendingRequest", pendingRequestSchema);
