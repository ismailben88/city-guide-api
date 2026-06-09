const { Schema, model, Types } = require("mongoose");

const placeSchema = new Schema(
  {
    name:       { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, lowercase: true },
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },
    cityId:     { type: Types.ObjectId, ref: "City",     required: true },

    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    isVerifiedBusiness: { type: Boolean, default: false },
    ownerId:            { type: Types.ObjectId, ref: "User", default: null },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0 },

    description: { type: String, default: "" },
    address:     { type: String, default: "" },
    images:      { type: [String], default: [] },

    phone:        { type: String, default: "" },
    website:      { type: String, default: "" },
    openingHours: { type: String, default: "" },
    tags:         { type: [String], default: [] },

    status:          { type: String, enum: ["active", "archived", "pending", "rejected"], default: "active" },
    rejectionReason: { type: String, default: "" },
    isFeatured:      { type: Boolean, default: false },
    priceRange: { type: String, default: "" },
    entryFee:   { type: Number, default: null },

    translations:      { type: Schema.Types.Mixed, default: {} },
    sourceLang:        { type: String, default: "fr" },
    translationStatus: { type: String, enum: ["pending", "done", "failed"], default: "pending" },
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ cityId: 1, categoryId: 1 });
placeSchema.index({ status: 1, isFeatured: 1 });
placeSchema.index({ averageRating: -1 });
// Hot homepage / explore paths: top-rated active places per city/category
placeSchema.index({ status: 1, averageRating: -1 });
placeSchema.index({ status: 1, cityId: 1, averageRating: -1 });
placeSchema.index({ status: 1, categoryId: 1, averageRating: -1 });
placeSchema.index({ status: 1, isFeatured: 1, averageRating: -1 });
// Business dashboard: places owned by a user — sorted by recent edit.
placeSchema.index({ ownerId: 1, updatedAt: -1 });
// Verified-business listings on category pages.
placeSchema.index({ status: 1, isVerifiedBusiness: 1 });

// ── Indexes added for the paginated /places contract ───────────────────────
// `_id: 1` at the tail gives the planner a stable tie-breaker which keeps
// `skip/limit` cursors deterministic (no duplicate or skipped rows when two
// docs share the same cityId/category).
placeSchema.index({ cityId: 1, categoryId: 1, _id: 1 });
// Hot path for the "popular per city" sort preset.
placeSchema.index({ cityId: 1, averageRating: -1 });
// Full-text search across name + description (used by ?search=...).
placeSchema.index({ name: "text", description: "text" });

module.exports = model("Place", placeSchema);
