const { Schema, model, Types } = require("mongoose");

const pendingRequestSchema = new Schema(
  {
    requestType: {
      type:     String,
      required: true,
      enum:     ["guide_application", "business_verification"],
    },
    requestedBy: { type: Types.ObjectId, ref: "User",  required: true },
    placeId:     { type: Types.ObjectId, ref: "Place", default: null },
    payload:     { type: Schema.Types.Mixed, default: {} },
    status:      { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy:  { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Lazy require pour éviter les dépendances circulaires
pendingRequestSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc || doc.status !== "approved") return;

  const Place        = require("./Place");
  const GuideProfile = require("./GuideProfile");
  const User         = require("./User");
  const AdminLog     = require("./AdminLog");

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

module.exports = model("PendingRequest", pendingRequestSchema);
