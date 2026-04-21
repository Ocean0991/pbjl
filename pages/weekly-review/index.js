const App = getApp();
const { formatDate } = require('../../utils/util');
const { buildWeeklyReview, buildRiskSnapshot, getCurrentWeek, summarizeWeek } = require('../../utils/training-engine');
const { calculateTrainingLoad, interpretTSB } = require('../../utils/load-engine-v2');

Page({
  data: {
    review: null,
    weekLabel: '',
    completionRate: 0,
    riskLabel: '',
    reviewItems: [],
    nextSuggestion: '',
    loadData: null,
    tsbStatus: null,
    weekWorkouts: [],
    hasData: false
  },

  onLoad() {
    this.loadWeeklyReview();
  },

  onShow() {
    this.loadWeeklyReview();
  },

  loadWeeklyReview() {
    const state = App.getState();
    if (!state.profile || !state.plan) {
      this.setData({ hasData: false });
      return;
    }

    const today = formatDate(new Date());
    const riskSnapshot = buildRiskSnapshot(state, today);
    const review = buildWeeklyReview(state.plan, state.records, today, riskSnapshot);
    const loadData = calculateTrainingLoad(state.records, today);
    const tsbStatus = interpretTSB(loadData.tsb);
    const currentWeek = getCurrentWeek(state.plan, today);

    let weekWorkouts = [];
    if (currentWeek && currentWeek.days) {
      const typeLabels = {
        easy: '轻松跑', long: '长距离', quality: '质量课',
        recovery: '恢复跑', strength: '力量训练', rest: '休息',
        cross: '交叉训练', mobility: '灵活性恢复', race: '比赛日'
      };
      weekWorkouts = currentWeek.days.map(day => {
        const record = state.records ? state.records[day.dateKey] : null;
        return {
          dateKey: day.dateKey,
          title: day.title,
          type: day.type,
          typeLabel: typeLabels[day.type] || day.title,
          target: day.target,
          isCompleted: record && record.completion !== 'missed',
          isMissed: record && record.completion === 'missed',
          isPending: !record
        };
      });
    }

    this.setData({
      review,
      weekLabel: review ? review.label : '',
      completionRate: review ? parseInt(review.completionText) : 0,
      riskLabel: review ? review.riskText : '低风险',
      reviewItems: review ? review.items : [],
      nextSuggestion: review ? review.nextSuggestion : '',
      loadData,
      tsbStatus,
      weekWorkouts,
      hasData: true
    });
  },

  onBack() {
    wx.navigateBack();
  }
});
