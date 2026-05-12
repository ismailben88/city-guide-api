const memoryService = require("./memory.service");
const contextExtractor = require("./context-extractor");
const contextManager = require("./context-manager");

function initSession(sessionId) {
  memoryService.getSession(sessionId);
}

function getContext(sessionId) {
  return memoryService.getContext(sessionId);
}

function processMessage(sessionId, userMessage) {
  const extracted = contextExtractor.extractAll(userMessage);
  const currentContext = memoryService.getContext(sessionId);
  const resolved = contextManager.resolve(currentContext, extracted, userMessage);
  memoryService.updateContext(sessionId, resolved);
  return { extracted, resolved };
}

function updateSearchContext(sessionId, type, rankedData, categorySlug) {
  memoryService.updateContext(sessionId, {
    lastSearchType: type,
    lastSearchResults: rankedData,
    lastCategory: categorySlug,
  });
}

function getHistory(sessionId) {
  return memoryService.getHistoryForPrompt(sessionId);
}

function saveMessages(sessionId, userMessage, aiMessage, type, data) {
  memoryService.addMessage(sessionId, "user", userMessage);
  memoryService.addMessage(sessionId, "assistant", aiMessage, type, data);
}

function getFullSnapshot(sessionId) {
  const context = memoryService.getContext(sessionId);
  const history = memoryService.getHistoryForPrompt(sessionId);
  return { context, history };
}

function clearSession(sessionId) {
  memoryService.clearSession(sessionId);
}

module.exports = {
  initSession,
  getContext,
  processMessage,
  updateSearchContext,
  getHistory,
  saveMessages,
  getFullSnapshot,
  clearSession,
};
