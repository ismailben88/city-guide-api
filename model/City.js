const { Schema, model } = require("mongoose");

const citySchema = new Schema(
  {
    name:   { type: String, required: true, trim: true },
    slug:   { type: String, required: true, unique: true, lowercase: true },
    region: { type: String, default: "" },
    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

citySchema.index({ location: "2dsphere" });

module.exports = model("City", citySchema);
