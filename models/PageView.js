const { Schema, model } = require("mongoose");

const pageViewSchema = new Schema({
  path:      { type: String, required: true, maxlength: 500 },
  sessionId: { type: String, required: true, maxlength: 128 },
  userId:    { type: Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

module.exports = model("PageView", pageViewSchema);
