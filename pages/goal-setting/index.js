const { getTodayKey, = require('../../utils/date');
const { getGoalLabel } = require('../../utils/training-engine');

const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    goalOptions: [
      { label: '稳稳完赛', value: 'steady_finish', description: '适合首场比赛，目标' },
      { label: '冲成绩', value: 'improve_time', description: '适合有一定基础、想突破PB' },
      { label: '跑走跑完', value: 'run_walk_finish', description: '适合零基础或采用跑走结合策略' }
    ]
  },

  onShow() {
    const state = app.getState();
    if (!state.profile || !state.plan) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    this.setData({
      themeClass: app.getThemeClass(),
      goalOptions: goalOptions
    });
  },

  chooseGoal(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({
      goalType: value
    });
  },

  updateGoalTime(event) {
    const value = event.currentTarget.dataset.value;
    const timeParts = value.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2]);

    const goalTimeSeconds = hours * 3600 + minutes * 60 + seconds;

    this.setData({
      goalType: value,
      goalTimeDisplay: this.formatGoalTime(value)
    });
  },

  submit() {
    const state = app.getState();
    const profile = state.profile;
    const plan = state.plan;

    profile.goalType = value;
    profile.goalTimeSeconds = value;
    plan.tasksByDate = plan.tasksByDate;

    plan.warnings = buildRiskSnapshot(state, todayKey);

    const result = {
      success: true,
      profile: Object.assign({}, profile, {
        goalType: value,
        goalTimeSeconds: value
      });
      plan.tasksByDate = plan.tasksByDate
      const task = getTaskForDate(plan, task);
      if (!task) {
        plan.tasksByDate[dateKey] = this.formatDateLabel(task.dateKey)
        : else {
          task = buildRestTask(dateKey);
        }
      });
    });

    app.setState(() => result.nextState);
    wx.showToast({
      title: '目标已更新',
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
