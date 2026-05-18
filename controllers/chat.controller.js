const asyncHandler  = require("../utils/asyncHandler");
const chatService   = require("../services/chat.service");

exports.sendMessage = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message is required" });
  }
  if (message.length > 1000) {
    return res.status(400).json({ success: false, message: "Message too long (max 1000 characters)" });
  }

  const result = await chatService.processMessage(message.trim(), sessionId);

  res.json({
    success: true,
    data: {
      message:   result.message,
      type:      result.type,
      data:      result.data,
      sessionId: result.sessionId, // client must persist this and send it back each turn
    },
  });
});
