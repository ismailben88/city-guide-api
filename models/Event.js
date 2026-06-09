const { Schema, model, Types } = require("mongoose");

const eventSchema = new Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    coverImage:  { type: String, default: "" },
    organizer:   { type: String, default: "" },
    ticketPrice: { type: Number, default: 0 },
    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    cityId: { type: Types.ObjectId, ref: "City", required: true },

    dateRange: {
      from: { type: Date, required: true },
      to:   { type: Date },
    },

    category: {
      type: String,
      enum: ["concert", "exhibition", "theatre", "sport", "festival", "music", "culture", "art", "workshop", "other"],
      default: "other",
    },

    organizedBy: { type: Types.ObjectId, ref: "User" },
    status:      { type: String, enum: ["upcoming", "ongoing", "cancelled", "past"], default: "upcoming" },
    isFeatured:  { type: Boolean, default: false },

    translations:      { type: Schema.Types.Mixed, default: {} },
    sourceLang:        { type: String, default: "fr" },
    translationStatus: { type: String, enum: ["pending", "done", "failed"], default: "pending" },
  },
  { timestamps: true }
);

eventSchema.index({ location: "2dsphere" });
eventSchema.index({ cityId: 1, "dateRange.from": 1 });
eventSchema.index({ status: 1, isFeatured: 1 });
// Filter "upcoming/this_week/this_month" in EventsPage hits this hot path.
eventSchema.index({ status: 1, "dateRange.from": 1 });
eventSchema.index({ category: 1, status: 1, "dateRange.from": 1 });
eventSchema.index({ organizedBy: 1, createdAt: -1 });

// ── Indexes added for the paginated /events contract ──────────────────────
// `_id` tail gives the planner a deterministic cursor for skip/limit.
eventSchema.index({ cityId: 1, category: 1, status: 1, _id: 1 });
// Standalone date index — useful for `?sort=date_asc/date_desc` without a
// status filter.
eventSchema.index({ "dateRange.from": 1 });

// Validate that dateRange.to >= dateRange.from when both are present.
eventSchema.pre("validate", function (next) {
  if (this.dateRange?.to && this.dateRange?.from && this.dateRange.to < this.dateRange.from) {
    return next(new Error("dateRange.to must be greater than or equal to dateRange.from"));
  }
  next();
});

module.exports = model("Event", eventSchema);
