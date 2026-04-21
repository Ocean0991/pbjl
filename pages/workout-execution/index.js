const App = getApp();
const { formatDate } = require('../../utils/util');
const { getTaskForDate } = require('../../utils/training-engine');

Page({
  data: {
    dateKey: '',
    workout: null,
    isCompleted: false,
    record: null
  },

  onLoad(options) {
    const date = options.date || formatDate(new Date());
    this.loadWorkout(date);
  },

  loadWorkout(date) {
    const state = App.getState();
    if (!state.plan) return;

    const task = getTaskForDate(state.plan, date);
    const record = state.records ? state.records[date] : null;

    this.setData({
      dateKey: date,
      workout: task,
      isCompleted: record && record.completion !== 'missed',
      record
    });
  },

  onGoToFeedback() {
    wx.navigateTo({
      url: `/pages/checkin/index?date=${this.data.dateKey}`
    });
  },

  onGoBack() {
    wx.navigateBack();
  }
});
