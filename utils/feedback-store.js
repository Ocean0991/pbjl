const FEEDBACK_STORAGE_KEY = 'first-half-marathon-feedback-log';

function createDefaultFeedbackState() {
  return {
    entries: [],
    totalCount: 0,
    lastSubmittedAt: ''
  };
}

function normalizeFeedbackState(input) {
  const base = createDefaultFeedbackState();

  if (!input || typeof input !== 'object') {
    return base;
  }

  return {
    entries: Array.isArray(input.entries) ? input.entries : [],
    totalCount: Number.isFinite(Number(input.totalCount))
      ? Number(input.totalCount)
      : Array.isArray(input.entries)
        ? input.entries.length
        : 0,
    lastSubmittedAt: input.lastSubmittedAt || ''
  };
}

function loadFeedbackState() {
  try {
    return normalizeFeedbackState(wx.getStorageSync(FEEDBACK_STORAGE_KEY));
  } catch (error) {
    return createDefaultFeedbackState();
  }
}

function saveFeedbackState(state) {
  const normalized = normalizeFeedbackState(state);

  try {
    wx.setStorageSync(FEEDBACK_STORAGE_KEY, normalized);
    return normalized;
  } catch (error) {
    return normalized;
  }
}

function appendFeedbackEntry(payload) {
  const current = loadFeedbackState();
  const entry = {
    id: `feedback_${Date.now()}`,
    content: payload.content || '',
    contact: payload.contact || '',
    screenshotCount: payload.screenshotCount || 0,
    createdAt: new Date().toISOString()
  };
  const nextState = {
    entries: [entry].concat(current.entries).slice(0, 20),
    totalCount: current.totalCount + 1,
    lastSubmittedAt: entry.createdAt
  };

  return {
    entry,
    state: saveFeedbackState(nextState)
  };
}

module.exports = {
  FEEDBACK_STORAGE_KEY,
  appendFeedbackEntry,
  createDefaultFeedbackState,
  loadFeedbackState,
  normalizeFeedbackState,
  saveFeedbackState
};
