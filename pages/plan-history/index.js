const { getTodayKey, formatDateLabel } = require('../../utils/date');
const { getGoalLabel } = require('../../utils/training-engine');

const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    versions: [],
    currentVersionId: ''
  },

  onShow() {
    const state = app.getState();
    if (!state.profile || !state.plan) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    const versions = this.buildVersionList(state);
    this.setData({
      themeClass: app.getThemeClass(),
      versions: versions,
      currentVersionId: state.plan.versionId || 'v1'
    });
  },

  buildVersionList(state) {
    const versions = [];
    const planHistory = state.planHistory || [];

    if (planHistory.length === 0) {
      versions.push({
        id: state.plan.versionId || 'v1',
        label: '初始计划',
        goalLabel: getGoalLabel(state.plan.currentGoal),
        createdAt: state.plan.createdAt || state.profile.raceDate,
        status: 'active',
        summary: '这是你建档时生成的初始训练计划。',
        weeksCount: state.plan.totalWeeks,
        raceDate: state.profile.raceDate
      });
    } else {
      planHistory.forEach(function(item, index) {
        versions.push({
          id: item.versionId || 'v' + (index + 1),
          label: item.rebuildReason ? '重组计划' : '计划版本 ' + (index + 1),
          goalLabel: getGoalLabel(item.currentGoal),
          createdAt: item.createdAt,
          status: index === planHistory.length - 1 ? 'active' : 'archived',
          summary: item.rebuildReason || '计划调整',
          weeksCount: item.totalWeeks,
          raceDate: item.raceDate
        });
      });
    }

    return versions.reverse();
  },

  viewVersion(event) {
    const versionId = event.currentTarget.dataset.id;
    wx.showToast({
      title: '查看历史版本功能开发中',
      icon: 'none'
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
