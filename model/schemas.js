// ─────────────────────────────────────────────────────────────────────────────
//  CityGuide Morocco — Schemas Mongoose complets
//  12 collections · Architecture Backend Senior
//  Basé sur : ERD + API Spec /api/v1
// ─────────────────────────────────────────────────────────────────────────────
//  npm install mongoose bcryptjs jsonwebtoken
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const { Schema, model, Types } = mongoose;

// ═════════════════════════════════════════════════════════════════════════════
//  1. USER
//  Unifie auth + profil. isGuide = flag rapide pour sauter vers GuideProfile
// ═════════════════════════════════════════════════════════════════════════════

const userSchema = new Schema(
  {
    firstName:  { type: String, required: true, trim: true },
    lastName:   { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:{ type: String, required: true, select: false },
    authProvider:{ type: String, enum: ["local", "google", "facebook"], default: "local" },

    role: {
      type:    String,
      enum:    ["visitor", "user", "guide", "entrepreneur", "admin"],
      default: "user",
    },

    isGuide:     { type: Boolean, default: false },
    avatarUrl:   { type: String,  default: "" },

    linkedAccounts: [
      {
        platform: { type: String },   // "google" | "facebook" | "github"
        accountId:{ type: String },
        email:    { type: String },
      },
    ],

    isVerified:  { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Hash avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

const User = model("User", userSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  2. CITY
//  Entité géographique de référence. Lieu = location GeoJSON Point
// ═════════════════════════════════════════════════════════════════════════════

const citySchema = new Schema(
  {
    name:   { type: String, required: true, trim: true },
    slug:   { type: String, required: true, unique: true, lowercase: true },
    region: { type: String, default: "" },
    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },  // [lng, lat]
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

citySchema.index({ location: "2dsphere" });
citySchema.index({ slug: 1 });

const City = model("City", citySchema);


// ═════════════════════════════════════════════════════════════════════════════
//  3. CATEGORY
//  Arbre auto-référencé : parentId = null → racine, sinon sous-catégorie
// ═════════════════════════════════════════════════════════════════════════════

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
categorySchema.index({ slug: 1 });

const Category = model("Category", categorySchema);


// ═════════════════════════════════════════════════════════════════════════════
//  4. GUIDE_PROFILE
//  Lié à User (1-to-1). Créé via POST /guides + PendingRequest guide_application
// ═════════════════════════════════════════════════════════════════════════════

const guideProfileSchema = new Schema(
  {
    userId: {
      type:     Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },

    specialties:    [{ type: String, trim: true }],
    spokenLanguages:[{ type: String, trim: true }],

    cityIds: [{ type: Types.ObjectId, ref: "City" }],

    pricePerHour: { type: Number, default: 0, min: 0 },

    availability: {
      days:  [{ type: String }],      // ["monday","tuesday",...]
      hours: { from: String, to: String },
    },

    verificationStatus: {
      type:    String,
      enum:    ["pending", "verified", "rejected"],
      default: "pending",
    },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0 },

    verifiedBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

guideProfileSchema.index({ userId: 1 });
guideProfileSchema.index({ cityIds: 1 });
guideProfileSchema.index({ verificationStatus: 1 });
guideProfileSchema.index({ averageRating: -1 });

const GuideProfile = model("GuideProfile", guideProfileSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  5. PLACE
//  Core de la plateforme. GeoJSON pour /nearby. isVerifiedBusiness = flag business
// ═════════════════════════════════════════════════════════════════════════════

const placeSchema = new Schema(
  {
    name:       { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, lowercase: true },
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },
    cityId:     { type: Types.ObjectId, ref: "City",     required: true },

    location: {
      type:        { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },  // [lng, lat]
    },

    isVerifiedBusiness: { type: Boolean, default: false },
    ownerId:            { type: Types.ObjectId, ref: "User", default: null },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0 },

    status:     { type: String, enum: ["active", "archived", "pending"], default: "active" },
    isFeatured: { type: Boolean, default: false },
    priceRange: { type: String, default: "" },    // "€" | "€€" | "€€€"
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ slug: 1 });
placeSchema.index({ cityId: 1, categoryId: 1 });
placeSchema.index({ status: 1, isFeatured: 1 });
placeSchema.index({ isVerifiedBusiness: 1 });
placeSchema.index({ averageRating: -1 });

const Place = model("Place", placeSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  6. EVENT
//  GeoJSON pour /nearby. Organisé par User (Admin ou owner)
// ═════════════════════════════════════════════════════════════════════════════

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

const Event = model("Event", eventSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  7. SCORE  (Ratings + Analytics)
//  Polymorphique : cible Place ou GuideProfile
//  Hook post-save → updateRunningTotals() recalcule averageRating + reviewCount
// ═════════════════════════════════════════════════════════════════════════════

const scoreSchema = new Schema(
  {
    targetId:   { type: Types.ObjectId, required: true, refPath: "targetType" },
    targetType: { type: String, required: true, enum: ["Place", "GuideProfile"] },
    score:      { type: Number, required: true, min: 1, max: 5 },
    authorId:   { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Un seul score par user par cible
scoreSchema.index({ targetId: 1, targetType: 1, authorId: 1 }, { unique: true });

// Recalcul automatique averageRating + reviewCount
async function updateRunningTotals(targetId, targetType) {
  const stats = await Score.aggregate([
    { $match: { targetId: new Types.ObjectId(targetId), targetType } },
    { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } },
  ]);
  const avg   = stats[0] ? +stats[0].avg.toFixed(2) : 0;
  const count = stats[0] ? stats[0].count : 0;
  const TargetModel = targetType === "Place" ? Place : GuideProfile;
  await TargetModel.findByIdAndUpdate(targetId, {
    averageRating: avg,
    reviewCount:   count,
  });
}

scoreSchema.post("save",             function () { updateRunningTotals(this.targetId, this.targetType); });
scoreSchema.post("findOneAndUpdate", function (doc) { if (doc) updateRunningTotals(doc.targetId, doc.targetType); });
scoreSchema.post("findOneAndDelete", function (doc) { if (doc) updateRunningTotals(doc.targetId, doc.targetType); });

const Score = model("Score", scoreSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  8. COMMENT
//  Polymorphique + auto-référencé pour les replies (parentCommentId)
// ═════════════════════════════════════════════════════════════════════════════

const commentSchema = new Schema(
  {
    targetId:         { type: Types.ObjectId, required: true, refPath: "targetType" },
    targetType:       { type: String, required: true, enum: ["Place", "GuideProfile", "Event"] },
    authorId:         { type: Types.ObjectId, ref: "User", required: true },
    content:          { type: String, required: true, maxlength: 1000, trim: true },
    parentCommentId:  { type: Types.ObjectId, ref: "Comment", default: null },  // null = root
    status:           { type: String, enum: ["active", "deleted", "flagged"], default: "active" },
    likeCount:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ targetId: 1, targetType: 1, parentCommentId: 1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ status: 1 });

const Comment = model("Comment", commentSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  9. MEDIA
//  Polymorphique : photos/vidéos attachées à Place, GuideProfile ou Event
// ═════════════════════════════════════════════════════════════════════════════

const mediaSchema = new Schema(
  {
    url:        { type: String, required: true },
    type:       { type: String, enum: ["image", "video"], default: "image" },
    parentType: { type: String, required: true, enum: ["Place", "GuideProfile", "Event"] },
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

const Media = model("Media", mediaSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  10. PENDING_REQUEST
//  File d'attente admin : guide_application + business_verification
//  Side-effects sur approval : see API spec
// ═════════════════════════════════════════════════════════════════════════════

const pendingRequestSchema = new Schema(
  {
    requestType: {
      type:     String,
      required: true,
      enum:     ["guide_application", "business_verification"],
    },
    requestedBy: { type: Types.ObjectId, ref: "User",  required: true },
    placeId:     { type: Types.ObjectId, ref: "Place", default: null },   // pour business_verification
    payload:     { type: Schema.Types.Mixed, default: {} },               // données de la demande
    status:      { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy:  { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Side-effects sur approbation
pendingRequestSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc || doc.status !== "approved") return;

  if (doc.requestType === "business_verification") {
    await Place.findByIdAndUpdate(doc.placeId, {
      isVerifiedBusiness: true,
      ownerId: doc.requestedBy,
    });
    await AdminLog.create({
      adminId:    doc.reviewedBy,
      action:     "approve_business",
      targetType: "Place",
      targetId:   doc.placeId,
      metadata:   { requestId: doc._id },
    });
  }

  if (doc.requestType === "guide_application") {
    await GuideProfile.findOneAndUpdate(
      { userId: doc.requestedBy },
      { verificationStatus: "verified", verifiedBy: doc.reviewedBy }
    );
    await User.findByIdAndUpdate(doc.requestedBy, { isGuide: true });
    await AdminLog.create({
      adminId:    doc.reviewedBy,
      action:     "approve_guide",
      targetType: "GuideProfile",
      targetId:   doc.requestedBy,
      metadata:   { requestId: doc._id },
    });
  }
});

pendingRequestSchema.index({ requestType: 1, status: 1 });
pendingRequestSchema.index({ requestedBy: 1 });

const PendingRequest = model("PendingRequest", pendingRequestSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  11. REPORT
//  Signalements : polymorphique sur Place, GuideProfile, Comment, Event
// ═════════════════════════════════════════════════════════════════════════════

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

const Report = model("Report", reportSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  12. ADMIN_LOG
//  Journal d'audit immuable — chaque action admin est tracée
// ═════════════════════════════════════════════════════════════════════════════

const adminLogSchema = new Schema(
  {
    adminId:    { type: Types.ObjectId, ref: "User",  required: true },
    action:     { type: String, required: true },          // "approve_guide" | "ban_user" | ...
    targetType: { type: String, required: true },
    targetId:   { type: Types.ObjectId, required: true },
    metadata:   { type: Schema.Types.Mixed, default: {} }, // payload JSON libre
    createdAt:  { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    // Immuable : aucune mise à jour autorisée
    methods: {},
  }
);

adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ targetType: 1, targetId: 1 });
adminLogSchema.index({ action: 1, createdAt: -1 });

const AdminLog = model("AdminLog", adminLogSchema);


// ═════════════════════════════════════════════════════════════════════════════
//  Connexion MongoDB Atlas
// ═════════════════════════════════════════════════════════════════════════════

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "cityguide" });
    console.log("MongoDB Atlas connecte ✓");
  } catch (err) {
    console.error("Connexion echouee :", err.message);
    process.exit(1);
  }
};


// ═════════════════════════════════════════════════════════════════════════════
//  Exports
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  connectDB,
  User,
  City,
  Category,
  GuideProfile,
  Place,
  Event,
  Score,
  Comment,
  Media,
  PendingRequest,
  Report,
  AdminLog,
};
