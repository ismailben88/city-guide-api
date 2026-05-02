const { Schema, model, Types } = require("mongoose");

const categorySchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    slug:     { type: String, required: true, unique: true, lowercase: true },
    icon:     { type: String, default: "" },
    parentId: { type: Types.ObjectId, ref: "Category", default: null },
    status:   { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

categorySchema.index({ parentId: 1 });

module.exports = model("Category", categorySchema);
