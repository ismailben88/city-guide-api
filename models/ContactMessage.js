const { Schema, model } = require("mongoose");

const contactMessageSchema = new Schema(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("ContactMessage", contactMessageSchema);
