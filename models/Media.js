const { Schema, model, Types } = require("mongoose");

const mediaSchema = new Schema(
  {
    url:        { type: String, required: true },
    type:       { type: String, enum: ["image", "video"], default: "image" },
    parentType: { type: String, required: true, enum: ["Place", "GuideProfile", "Event", "User"] },
    parentId:   { type: Types.ObjectId, required: true, refPath: "parentType" },
    uploadedBy: { type: Types.ObjectId, ref: "User", required: true },
    order:      { type: Number, default: 0 },
    status:     { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    caption:    { type: String, default: "" },
  },
  { timestamps: true }
);

mediaSchema.index({ parentId: 1, parentType: 1, order: 1 });
mediaSchema.index({ uploadedBy: 1 });

module.exports = model("Media", mediaSchema);
