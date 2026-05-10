const asyncHandler = require("../utils/asyncHandler");
const chatService = require("../services/chat.service");

exports.sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  const result = await chatService.processMessage(message.trim());

  res.json({
    success: true,
    data: {
      response: result.response,
      dbResults: result.dbResults,
    },
  });
});
