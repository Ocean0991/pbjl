const App = getApp();
const { formatDate } = require('../../utils/util');

Page({
  data: {
    userInfo: {},
    profile: {}
    totalWorkouts: 0,
    totalDistance: 0,
    totalDuration: 0,
    personalRecords: {
      fiveK: null,
      fiveKDate: null,
      tenK: null,
      tenKDate: null,
      halfMarathon: null,
      halfMarathonDate: null,
      fullMarathon: null,
      fullMarathonDate: null
    }
  },

  onLoad() {
    this.loadProfileData();
  },

  onShow() {
    this.loadProfileData();
  },

  loadProfileData() {
    const state = App.getState();
    const profile = state.profile || {};
    const raceTypeLabels = {
      '5k': '5公里', '10k': '10公里',
      'half': '半程马拉松', 'full': '全程马拉松'
    };

    profile.raceTypeLabel = raceTypeLabels[profile.raceType] || '半程马拉松';

    let totalWorkouts = 0;
    let totalDistance = 0;
    let totalDuration = 0;

    if (state.records) {
      Object.values(state.records).forEach(record => {
        if (record.completion !== 'missed') {
          totalWorkouts++;
          totalDistance += record.distance || 0;
          totalDuration += record.duration || 0;
        }
      });
    }

    const personalRecords = this.calculatePersonalRecords(state.records || {}, profile);

    this.setData({
      userInfo: state.userInfo || {},
      profile,
      totalWorkouts,
      totalDistance: totalDistance.toFixed(1),
      totalDuration: Math.round(totalDuration / 60),
      personalRecords
    });
  },

  calculatePersonalRecords(records, profile) {
    const pr = {
      fiveK: null,
      fiveKDate: null,
      tenK: null,
      tenKDate: null,
      halfMarathon: null,
      halfMarathonDate: null,
      fullMarathon: null,
      fullMarathonDate: null
    };

    if (profile.personalRecords) {
      Object.assign(pr, profile.personalRecords);
    }

    Object.values(records || {}).forEach(record => {
      if (record.distance && record.duration && record.completion !== 'missed') {
        const distance = record.distance;
        const pace = record.duration / distance;

        if (distance >= 5 && distance < 6) {
          if (!pr.fiveK || record.duration < this.parseTimeToSeconds(pr.fiveK)) {
            pr.fiveK = this.formatDuration(record.duration);
            pr.fiveKDate = record.dateKey || '';
          }
        }
        if (distance >= 10 && distance < 11) {
          if (!pr.tenK || record.duration < this.parseTimeToSeconds(pr.tenK)) {
            pr.tenK = this.formatDuration(record.duration);
            pr.tenKDate = record.dateKey || '';
          }
        }
        if (distance >= 21 && distance < 22) {
          if (!pr.halfMarathon || record.duration < this.parseTimeToSeconds(pr.halfMarathon)) {
            pr.halfMarathon = this.formatDuration(record.duration);
            pr.halfMarathonDate = record.dateKey || '';
          }
        }
        if (distance >= 42 && distance < 43) {
          if (!pr.fullMarathon || record.duration < this.parseTimeToSeconds(pr.fullMarathon)) {
            pr.fullMarathon = this.formatDuration(record.duration);
            pr.fullMarathonDate = record.dateKey || '';
          }
        }
      }
    });

    return pr;
  },

  formatDuration(seconds) {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  parseTimeToSeconds(timeStr) {
    if (!timeStr || timeStr === '--:--') return Infinity;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + parts[1];
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/onboarding/index?mode=edit' });
  },

  onTrainingReminder() {
    wx.showToast({ title: '训练提醒设置开发中', icon: 'none' });
  },

  onDataSync() {
    wx.showToast({ title: '数据同步开发中', icon: 'none' });
  },

  onPremium() {
    wx.showModal({
      title: '升级 Pro',
      content: 'Pro 版本包含：AI 教练深度分析、个性化配速策略、跑鞋磨损追踪、高级训练报告等功能。',
      confirmText: '了解详情',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: 'Pro 功能即将上线', icon: 'none' });
        }
      }
    });
  },

  onAboutUs() {
    wx.showModal({
      title: '关于',
      content: '这是一款基于 Runna 理念开发的跑步训练小程序，为你提供科学的训练计划、AI 教练指导和个性化配速建议。',
      showCancel: false
    });
  }
});
