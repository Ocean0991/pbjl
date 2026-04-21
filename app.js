const { createDefaultState, loadState, normalizeState, saveState } = require('./utils/store');
const { syncEcosystemState } = require('./utils/wechat-ecosystem');
const { generateTrainingPlan } = require('./utils/plan-generator');

App({
  globalData: {
    state: createDefaultState(),
    setupDraft: null
  },

  onLaunch() {
    this.globalData.state = syncEcosystemState(normalizeState(loadState()));
    
    if (this.globalData.state.profile && !this.globalData.state.plan) {
      this.generatePlanForProfile();
    }
  },

  getState() {
    return this.globalData.state;
  },

  setState(updater) {
    const previousState = this.globalData.state;
    const nextState = typeof updater === 'function' ? updater(previousState) : updater;
    this.globalData.state = syncEcosystemState(normalizeState(nextState));
    saveState(this.globalData.state);
    return this.globalData.state;
  },

  generatePlanForProfile() {
    const profile = this.globalData.state.profile;
    if (!profile || !profile.raceDate) {
      return;
    }

    const plan = generateTrainingPlan(profile);
    if (plan) {
      this.globalData.state.plan = plan;
      saveState(this.globalData.state);
    }
  },

  getThemeClass() {
    return 'theme-dark';
  }
});
