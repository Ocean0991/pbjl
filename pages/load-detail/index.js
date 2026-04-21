const { getTodayKey } = require('../../utils/date');
const { buildLoadSnapshot, buildLoadTrend, buildLoadSummaryText } = require('../../utils/load-engine');

const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    snapshot: null,
    trend: [],
    summaryText: '',
    stateLabel: '',
    stateText: ''
  },

  onShow() {
    const state = app.getState();
    if (!state.profile || !state.plan) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    const todayKey = getTodayKey();
    const snapshot = buildLoadSnapshot(state, todayKey);
    const trend = buildLoadTrend(state, todayKey, 28);
    const summaryText = buildLoadSummaryText(snapshot);

    const stateTexts = {
      push: '当前状态适合推进，可以按计划执行。',
      hold: '当前状态适中，保持现有节奏就好。',
      recover: '当前疲劳偏高，建议适当减量或增加恢复。'
    };

    this.setData({
      themeClass: app.getThemeClass(),
      snapshot: snapshot,
      trend: trend,
      summaryText: summaryText,
      stateLabel: snapshot.stateLabel,
      stateText: stateTexts[snapshot.stateLabel] || ''
    });
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.switchTab({
          url: '/pages/me/index'
        });
      }
    });
  }
});
