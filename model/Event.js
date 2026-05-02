const { Schema, model, Types } = require("mongoose");

const eventSchema = new Schema(
  {
    title:    { type: String, required: true, trim: true },
    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    cityId: { type: Types.ObjectId, ref: "City", required: true },

    dateRange: {
      from: { type: Date, required: true },
      to:   { type: Date },
    },

    organizedBy: { type: Types.ObjectId, ref: "User" },
    status:      { type: String, enum: ["upcoming", "ongoing", "cancelled", "past"], default: "upcoming" },
    isFeatured:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ location: "2dsphere" });
eventSchema.index({ cityId: 1, "dateRange.from": 1 });
eventSchema.index({ status: 1, isFeatured: 1 });

module.exports = model("Event", eventSchema);
