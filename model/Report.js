const { Schema, model, Types } = require("mongoose");

const reportSchema = new Schema(
  {
    targetId:   { type: Types.ObjectId, required: true, refPath: "targetType" },
    targetType: {
      type:     String,
      required: true,
      enum:     ["Place", "GuideProfile", "Event", "Comment"],
    },
    reportedBy: { type: Types.ObjectId, ref: "User", required: true },
    reason:     { type: String, required: true, trim: true },
    status:     { type: String, enum: ["open", "reviewed", "resolved"], default: "open" },
    reviewedBy: { type: Types.ObjectId, ref: "User", default: null },
    note:       { type: String, default: "" },
  },
  { timestamps: true }
);

reportSchema.index({ targetId: 1, targetType: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ reportedBy: 1 });

module.exports = model("Report", reportSchema);
