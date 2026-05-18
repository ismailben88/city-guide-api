const SESSION_TTL = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_HISTORY = 20;

const sessions = new Map();

let cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL).unref(); // .unref() prevents the timer from blocking process exit

class ConversationMemory {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.history = [];
    this.context = {
      city: null,
      category: null,
      budget: null,
      language: null,
      travelType: null,
      preferences: [],
      lastSearchResults: null,
      lastSearchType: null,
      lastLocation: null,
    };
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }
}

function getSession(sessionId) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = new ConversationMemory(sessionId);
    sessions.set(sessionId, session);
  }
  session.lastActivity = Date.now();
  return session;
}

function addMessage(sessionId, role, content, type = null, data = null) {
  const session = getSession(sessionId);
  session.history.push({ role, content, timestamp: Date.now(), type, data });
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
  return session;
}

function getHistory(sessionId, limit = 10) {
  const session = getSession(sessionId);
  return session.history.slice(-limit);
}

function updateContext(sessionId, updates) {
  const session = getSession(sessionId);
  Object.assign(session.context, updates);
  return session.context;
}

function getContext(sessionId) {
  return { ...getSession(sessionId).context };
}

function clearSession(sessionId) {
  sessions.delete(sessionId);
}

function getHistoryForPrompt(sessionId, maxMessages = 6) {
  const session = getSession(sessionId);
  return session.history
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

function cleanup() {
  clearInterval(cleanupTimer);
  cleanupTimer = null;
}

module.exports = {
  getSession,
  addMessage,
  getHistory,
  updateContext,
  getContext,
  clearSession,
  getHistoryForPrompt,
  cleanup,
};
