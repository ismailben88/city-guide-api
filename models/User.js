const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:{ type: String, required: true, select: false },
    authProvider:{ type: String, enum: ["local", "google", "facebook"], default: "local" },

    role: {
      type:    String,
      enum:    ["visitor", "user", "guide", "entrepreneur", "admin"],
      default: "user",
    },

    isGuide:   { type: Boolean, default: false },
    avatarUrl: { type: String,  default: "" },

    // Extended profile
    bio:         { type: String,  default: "" },
    phone:       { type: String,  default: "" },
    whatsapp:    { type: String,  default: "" },
    instagram:   { type: String,  default: "" },
    website:     { type: String,  default: "" },
    city:        { type: String,  default: "" },
    nationality: { type: String,  default: "" },
    gender:      { type: String,  enum: ["Male", "Female", "Non-binary", ""], default: "" },
    dob:         { type: Date,    default: null },

    linkedAccounts: [
      {
        platform:  { type: String },
        accountId: { type: String },
        email:     { type: String },
      },
    ],

    isVerified:  { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    isPaused:    { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.index({ role: 1, isActive: 1 });

module.exports = model("User", userSchema);
