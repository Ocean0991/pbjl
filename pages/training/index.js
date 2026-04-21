const App = getApp();
const { formatDate } = require('../../utils/util');
const { calculateTrainingLoad } = require('../../utils/load-engine-v2');

Page({
  data: {
    weekDistance: 0,
    monthDistance: 0,
    totalDistance: 0,
    atl: 0,
    ctl: 0,
    tsb: 0,
    tsbClass: '',
    records: []
  },

  onLoad() {
    this.loadTrainingData();
  },

  onShow() {
    this.loadTrainingData();
  },

  loadTrainingData() {
    const state = App.getState();
    if (!state.records) return;

    this.calculateDistances(state.records);
    this.calculateLoad(state.records);
    this.loadRecords(state.records, state.plan);
  },

  calculateDistances(records) {
    const today = new Date();
    const todayKey = formatDate(today);
    
    let weekDistance = 0;
    let monthDistance = 0;
    let totalDistance = 0;

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoKey = formatDate(weekAgo);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoKey = formatDate(monthAgo);

    Object.keys(records).forEach(dateKey => {
      const record = records[dateKey];
      if (record.completion === 'missed') return;

      const distance = record.distance || 0;
      totalDistance += distance;

      if (dateKey >= weekAgoKey && dateKey <= todayKey) {
        weekDistance += distance;
      }

      if (dateKey >= monthAgoKey && dateKey <= todayKey) {
        monthDistance += distance;
      }
    });

    this.setData({
      weekDistance: weekDistance.toFixed(1),
      monthDistance: monthDistance.toFixed(1),
      totalDistance: totalDistance.toFixed(1)
    });
  },

  calculateLoad(records) {
    const today = formatDate(new Date());
    const loadData = calculateTrainingLoad(records, today);

    let tsbClass = '';
    if (loadData.tsb > 5) {
      tsbClass = 'positive';
    } else if (loadData.tsb < -10) {
      tsbClass = 'negative';
    }

    this.setData({
      atl: loadData.atl.toFixed(1),
      ctl: loadData.ctl.toFixed(1),
      tsb: loadData.tsb.toFixed(1),
      tsbClass
    });
  },

  loadRecords(records, plan) {
    const typeLabels = {
      easy: '轻松跑',
      long: '长距离',
      quality: '质量课',
      recovery: '恢复跑',
      strength: '力量训练',
      rest: '休息'
    };

    const recordsList = Object.keys(records)
      .filter(dateKey => records[dateKey].completion !== 'missed')
      .sort()
      .reverse()
      .slice(0, 20)
      .map(dateKey => {
        const record = records[dateKey];
        const date = new Date(dateKey);
        const task = plan && plan.tasksByDate ? plan.tasksByDate[dateKey] : null;

        return {
          dateKey,
          type: record.taskType || 'easy',
          title: record.taskTitle || typeLabels[record.taskType] || '训练',
          dateLabel: this.formatDateLabel(date),
          distance: (record.distance || 0).toFixed(1),
          duration: record.duration || 0,
          pace: this.formatPace(record.avgPace),
          avgHeartRate: record.avgHeartRate
        };
      });

    this.setData({ records: recordsList });
  },

  formatDateLabel(date) {
    const today = new Date();
    const todayKey = formatDate(today);
    const dateKey = formatDate(date);

    if (dateKey === todayKey) {
      return '今天';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);

    if (dateKey === yesterdayKey) {
      return '昨天';
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  formatPace(seconds) {
    if (!seconds || seconds === 0) return '--';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}'${secs.toString().padStart(2, '0')}"`;
  },

  onViewLoadDetail() {
    wx.navigateTo({
      url: '/pages/load-detail/index'
    });
  },

  onViewRecord(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/pages/workout-detail/index?date=${date}`
    });
  }
});
