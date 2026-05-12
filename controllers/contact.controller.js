const asyncHandler = require("../utils/asyncHandler");
const ContactMessage = require("../models/ContactMessage");

exports.sendMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are required: name, email, subject, message",
    });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  await ContactMessage.create({ name, email, subject, message });

  res.status(201).json({ success: true, message: "Message sent successfully" });
});
