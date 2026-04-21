const App = getApp();
const { formatDate } = require('../../utils/util');
const { getTaskForDate } = require('../../utils/training-engine');

Page({
  data: {
    dateKey: '',
    dateLabel: '',
    workout: null,
    isCompleted: false,
    record: null
  },

  onLoad(options) {
    const date = options.date || formatDate(new Date());
    this.loadWorkoutDetail(date);
  },

  loadWorkoutDetail(date) {
    const state = App.getState();
    if (!state.plan) {
      wx.showToast({ title: '未找到训练计划', icon: 'none' });
      return;
    }

    const task = getTaskForDate(state.plan, date);
    if (!task) {
      wx.showToast({ title: '未找到训练', icon: 'none' });
      return;
    }

    const record = (state.records && state.records[date]) ? state.records[date] : null;
    const dateObj = new Date(date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${weekdays[dateObj.getDay()]}`;

    this.setData({
      dateKey: date,
      dateLabel: dateLabel,
      workout: task,
      isCompleted: record ? (record.completion !== 'missed') : false,
      record: record ? record : null
    });

    wx.setNavigationBarTitle({ title: task.title || '训练详情' });
  },

  onGoToCheckin() {
    wx.navigateTo({
      url: `/pages/checkin/index?date=${this.data.dateKey}`
    });
  },

  onGoBack() {
    wx.navigateBack();
  }
});
