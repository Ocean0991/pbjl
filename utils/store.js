const STORAGE_KEY = 'first-half-marathon-companion-state';

function inferGoalTypeFromLegacy(plan) {
  if (!plan) {
    return 'standard_finish';
  }

  if (plan.currentGoalType) {
    return plan.currentGoalType;
  }

  if (plan.currentGoal === 'runwalk') {
    return 'run_walk_finish';
  }

  if (plan.mode === 'conservative') {
    return 'conservative_finish';
  }

  return 'standard_finish';
}

function createDefaultPlanState() {
  return {
    planVersion: 1,
    planStatus: 'normal',
    currentGoalType: 'standard_finish',
    recommendedGoalType: '',
    hasRebuiltPlan: false,
    rebuildHistory: [],
    longRunMissedStreak: 0,
    riskLevel: 'low',
    lastRiskTriggerReason: '',
    lastRebuiltAt: '',
    keepCurrentGoalConfirmedAt: ''
  };
}

function createDefaultEcosystemState() {
  return {
    friendShareCount: 0,
    timelineShareCount: 0,
    shareSourcePage: '',
    favoriteGuideShownCount: 0,
    miniProgramGuideShownCount: 0,
    subscriptionGuideShownCount: 0,
    homeVisitCount: 0,
    firstPlanGeneratedAt: '',
    firstWeekCompletedAt: '',
    firstLongRunCompletedAt: '',
    hasShownMiniProgramGuideAfterSetup: false,
    hasShownMiniProgramGuideAfterHabit: false,
    hasShownMiniProgramGuideAfterLongRun: false,
    hasShownFavoriteGuideHome: false,
    hasShownFavoriteGuideAdjustment: false,
    hasShownFavoriteGuideRaceReminder: false,
    hasSharedFirstWeek: false,
    hasSharedFirstLongRun: false,
    hasSharedCountdown21: false,
    subscriptionStatus: 'idle',
    subscriptionIntentEnabled: false,
    lastSubscriptionActionAt: '',
    lastFavoritePage: '',
    lastGuideType: '',
    lastGuideReason: ''
  };
}

function createDefaultState() {
  return {
    profile: null,
    screening: null,
    plan: null,
    planState: createDefaultPlanState(),
    ecosystem: createDefaultEcosystemState(),
    records: {},
    latestAdjustment: null,
    latestCalendarAdjustment: null,
    settings: {
      theme: 'dark'
    },
    meta: {
      version: 1,
      updatedAt: '',
      lastSetupAt: '',
      lastCheckinAt: '',
      currentRiskLevel: 'low'
    }
  };
}

function normalizeState(input) {
  const baseState = createDefaultState();

  if (!input || typeof input !== 'object') {
    return baseState;
  }

  const legacyGoalType = inferGoalTypeFromLegacy(input.plan);
  const rawPlanState = input.planState && typeof input.planState === 'object' ? input.planState : {};
  const rawEcosystem = input.ecosystem && typeof input.ecosystem === 'object' ? input.ecosystem : {};
  const normalizedPlanState = Object.assign({}, baseState.planState, rawPlanState, {
    currentGoalType: rawPlanState.currentGoalType || legacyGoalType,
    recommendedGoalType: rawPlanState.recommendedGoalType || '',
    rebuildHistory: Array.isArray(rawPlanState.rebuildHistory) ? rawPlanState.rebuildHistory : [],
    hasRebuiltPlan: Boolean(rawPlanState.hasRebuiltPlan),
    longRunMissedStreak: Number.isFinite(Number(rawPlanState.longRunMissedStreak)) ? Number(rawPlanState.longRunMissedStreak) : 0,
    riskLevel:
      rawPlanState.riskLevel ||
      (input.meta && input.meta.currentRiskLevel) ||
      (input.screening && input.screening.riskLevel) ||
      'low',
    lastRiskTriggerReason: rawPlanState.lastRiskTriggerReason || '',
    planVersion: Number.isFinite(Number(rawPlanState.planVersion)) && Number(rawPlanState.planVersion) > 0 ? Number(rawPlanState.planVersion) : 1,
    planStatus: rawPlanState.planStatus || (rawPlanState.hasRebuiltPlan ? 'rebuilt' : 'normal'),
    lastRebuiltAt: rawPlanState.lastRebuiltAt || '',
    keepCurrentGoalConfirmedAt: rawPlanState.keepCurrentGoalConfirmedAt || ''
  });

  return {
    profile: input.profile || null,
    screening: input.screening || null,
    plan: input.plan || null,
    planState: normalizedPlanState,
    ecosystem: Object.assign({}, baseState.ecosystem, rawEcosystem, {
      friendShareCount: Number.isFinite(Number(rawEcosystem.friendShareCount)) ? Number(rawEcosystem.friendShareCount) : 0,
      timelineShareCount: Number.isFinite(Number(rawEcosystem.timelineShareCount)) ? Number(rawEcosystem.timelineShareCount) : 0,
      favoriteGuideShownCount: Number.isFinite(Number(rawEcosystem.favoriteGuideShownCount)) ? Number(rawEcosystem.favoriteGuideShownCount) : 0,
      miniProgramGuideShownCount: Number.isFinite(Number(rawEcosystem.miniProgramGuideShownCount)) ? Number(rawEcosystem.miniProgramGuideShownCount) : 0,
      subscriptionGuideShownCount: Number.isFinite(Number(rawEcosystem.subscriptionGuideShownCount)) ? Number(rawEcosystem.subscriptionGuideShownCount) : 0,
      homeVisitCount: Number.isFinite(Number(rawEcosystem.homeVisitCount)) ? Number(rawEcosystem.homeVisitCount) : 0,
      subscriptionIntentEnabled: Boolean(rawEcosystem.subscriptionIntentEnabled)
    }),
    records: input.records && typeof input.records === 'object' ? input.records : {},
    latestAdjustment: input.latestAdjustment || null,
    latestCalendarAdjustment: input.latestCalendarAdjustment || null,
    settings: Object.assign({}, baseState.settings, input.settings || {}, {
      theme: 'dark'
    }),
    meta: Object.assign({}, baseState.meta, input.meta || {})
  };
}

function loadState() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || null;
  } catch (error) {
    return null;
  }
}

function saveState(state) {
  try {
    wx.setStorageSync(STORAGE_KEY, state);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  STORAGE_KEY,
  createDefaultEcosystemState,
  createDefaultPlanState,
  createDefaultState,
  normalizeState,
  loadState,
  saveState
};
