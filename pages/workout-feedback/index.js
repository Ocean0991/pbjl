const App = getApp();
const { formatDate } = require('../../utils/util');
const { buildRiskSnapshot } = require('../../utils/training-engine');
const { calculateTrainingLoad } = require('../../utils/load-engine-v2');

Page({
  data: {
    dateKey: '',
    workout: null,
    record: null,
    avgPace: '--',
    selectedRPE: 5,
    selectedFeeling: 'normal',
    selectedCompletion: 'full',
    notes: '',
    rpeScale: [
      { value: 1, label: '极轻' },
      { value: 2, label: '很轻' },
      { value: 3, label: '轻' },
      { value: 4, label: '较轻' },
      { value: 5, label: '适中' },
      { value: 6, label: '较累' },
      { value: 7, label: '累' },
      { value: 8, label: '很累' },
      { value: 9, label: '极累' },
      { value: 10, label: '极限' }
    ],
    feelingOptions: [
      { value: 'great', label: '很好', icon: '😄' },
      { value: 'normal', label: '一般', icon: '😐' },
      { value: 'tired', label: '疲劳', icon: '😩' },
      { value: 'bad', label: '不适', icon: '🤕' }
    ],
    completionOptions: [
      { value: 'full', label: '完全完成' },
      { value: 'partial', label: '部分完成' },
      { value: 'modified', label: '调整完成' }
    ],
    coachComment: '',
    adjustmentSuggestion: ''
  },

  onLoad(options) {
    const date = options.date || formatDate(new Date());
    this.loadFeedbackData(date);
  },

  loadFeedbackData(date) {
    const state = App.getState();
    if (!state.records || !state.records[date]) {
      wx.showToast({ title: '未找到训练记录', icon: 'none' });
      return;
    }

    const record = state.records[date];
    const workout = state.plan && state.plan.tasksByDate ? state.plan.tasksByDate[date] : null;
    const avgPace = this.formatPace(record.avgPace);

    const coachComment = this.buildCoachComment(record, workout);
    const adjustmentSuggestion = this.buildAdjustmentSuggestion(record, state, date);

    this.setData({
      dateKey: date,
      workout,
      record,
      avgPace,
      coachComment,
      adjustmentSuggestion
    });
  },

  formatPace(seconds) {
    if (!seconds || seconds === 0) return '--';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}'${secs.toString().padStart(2, '0')}"`;
  },

  buildCoachComment(record, workout) {
    if (!record || !workout) return '训练完成，辛苦了！';

    const parts = [];

    if (record.distance && workout.distance) {
      const ratio = record.distance / workout.distance;
      if (ratio >= 0.95) {
        parts.push('距离目标完成得很好');
      } else if (ratio >= 0.8) {
        parts.push('距离接近目标，差一点');
      } else {
        parts.push('距离和目标差距较大，但完成了就是进步');
      }
    }

    if (record.avgPace && workout.paceTargetSeconds) {
      const diff = record.avgPace - workout.paceTargetSeconds;
      if (Math.abs(diff) < 10) {
        parts.push('配速控制得很精准');
      } else if (diff > 0) {
        parts.push('配速偏慢一点，但稳比快重要');
      } else {
        parts.push('配速偏快，注意不要过度训练');
      }
    }

    if (parts.length === 0) {
      parts.push('训练完成，保持节奏最重要');
    }

    return parts.join('，') + '。';
  },

  buildAdjustmentSuggestion(record, state, date) {
    if (!record) return '';

    const suggestions = [];
    const loadData = calculateTrainingLoad(state.records, date);

    if (loadData.tsb < -30) {
      suggestions.push('你最近累积疲劳较高，建议接下来两天降强度');
    } else if (loadData.tsb < -15) {
      suggestions.push('身体有些疲劳，明天建议轻松跑或休息');
    }

    if (record.rpe && record.rpe >= 8) {
      suggestions.push('这次训练强度较大，注意充分恢复');
    }

    if (record.feeling === 'bad') {
      suggestions.push('身体不适时不要硬撑，可以先休息一天');
    } else if (record.feeling === 'tired') {
      suggestions.push('感觉疲劳时，把下次训练降一个等级更稳');
    }

    if (record.completion === 'partial') {
      suggestions.push('部分完成也没关系，不要为了补课而加量');
    }

    return suggestions.join('；');
  },

  onSelectRPE(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedRPE: value });
  },

  onSelectFeeling(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedFeeling: value });
  },

  onSelectCompletion(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ selectedCompletion: value });
  },

  onInputNotes(e) {
    this.setData({ notes: e.detail.value });
  },

  onSubmit() {
    const { dateKey, selectedRPE, selectedFeeling, selectedCompletion, notes } = this.data;

    const state = App.getState();
    if (!state.records[dateKey]) {
      wx.showToast({ title: '未找到训练记录', icon: 'none' });
      return;
    }

    state.records[dateKey].rpe = selectedRPE;
    state.records[dateKey].feeling = selectedFeeling;
    state.records[dateKey].completion = selectedCompletion;
    state.records[dateKey].notes = notes;
    state.records[dateKey].feedbackAt = new Date().toISOString();

    App.setState(() => state);

    wx.showToast({ title: '反馈已提交', icon: 'success', duration: 2000 });

    setTimeout(() => {
      wx.switchTab({ url: '/pages/today/index' });
    }, 2000);
  }
});
