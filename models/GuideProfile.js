const { Schema, model, Types } = require("mongoose");

const slotSchema = new Schema(
  { start: { type: String }, end: { type: String } },
  { _id: false }
);

const daySchema = new Schema(
  {
    day:    { type: String },
    isOpen: { type: Boolean, default: false },
    slots:  [slotSchema],
  },
  { _id: false }
);

const guideProfileSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },

    tagline:  { type: String, default: "" },
    bio:      { type: String, default: "" },
    bannerUrl:{ type: String, default: "" },

    specialties: [{ type: String, trim: true }],

    // Stored as { code, level } objects; accepts plain strings from older data
    spokenLanguages: [{ code: String, level: { type: String, default: "fluent" } }],

    cityIds:      [{ type: Types.ObjectId, ref: "City" }],
    pricePerHour: { type: Number, default: 0, min: 0 },

    isPublished:          { type: Boolean, default: false },
    isCurrentlyAvailable: { type: Boolean, default: true },

    schedule:         { type: [daySchema], default: [] },
    unavailableDates: [{ type: String }],

    availability: {
      days:  [{ type: String }],
      hours: { from: String, to: String },
    },

    verificationStatus: {
      type:    String,
      enum:    ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },

    verificationDocuments: {
      idDocument:      { url: { type: String, default: "" }, uploadedAt: { type: Date, default: null } },
      entrepreneurDoc: { url: { type: String, default: "" }, uploadedAt: { type: Date, default: null } },
    },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0 },
    verifiedBy:    { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

guideProfileSchema.index({ cityIds: 1 });
guideProfileSchema.index({ isPublished: 1 });
guideProfileSchema.index({ verificationStatus: 1 });
guideProfileSchema.index({ averageRating: -1 });

module.exports = model("GuideProfile", guideProfileSchema);
