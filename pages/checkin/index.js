const App = getApp();
const { formatDate } = require('../../utils/util');
const { getTaskForDate } = require('../../utils/training-engine');
const { calculateTrainingLoad } = require('../../utils/load-engine-v2');

Page({
  data: {
    dateKey: '',
    workout: null,
    selectedCompletion: '',
    completionOptions: [
      { value: 'full', label: '完成了', desc: '按计划完成' },
      { value: 'partial', label: '完成一部分', desc: '只跑了一部分' },
      { value: 'missed', label: '没完成', desc: '今天没跑成' }
    ],
    selectedRPE: 0,
    rpeScale: [
      { value: 1, label: '极轻' }, { value: 2, label: '很轻' },
      { value: 3, label: '轻' }, { value: 4, label: '较轻' },
      { value: 5, label: '适中' }, { value: 6, label: '较累' },
      { value: 7, label: '累' }, { value: 8, label: '很累' },
      { value: 9, label: '极累' }, { value: 10, label: '极限' }
    ],
    selectedFeeling: '',
    feelingOptions: [
      { value: 'easy', label: '轻松', icon: '😊' },
      { value: 'normal', label: '正常', icon: '😐' },
      { value: 'tired', label: '偏累', icon: '😩' },
      { value: 'hard', label: '很累', icon: '🥵' },
      { value: 'discomfort', label: '不适', icon: '🤕' }
    ],
    selectedReason: '',
    reasonOptions: [
      { value: 'no_time', label: '没时间' },
      { value: 'no_sleep', label: '熬夜/没睡好' },
      { value: 'work_busy', label: '工作忙' },
      { value: 'weather', label: '下雨/天气' },
      { value: 'slight_discomfort', label: '轻微不适' },
      { value: 'other', label: '其他' }
    ],
    notes: '',
    actualDistance: '',
    actualDuration: '',
    showResult: false,
    result: null
  },

  onLoad(options) {
    const date = options.date || formatDate(new Date());
    this.loadWorkout(date);
  },

  loadWorkout(date) {
    const state = App.getState();
    if (!state.plan) return;

    const task = getTaskForDate(state.plan, date);
    const existingRecord = state.records ? state.records[date] : null;

    if (existingRecord) {
      this.setData({
        dateKey: date,
        workout: task,
        selectedCompletion: existingRecord.completion || '',
        selectedRPE: existingRecord.rpe || 0,
        selectedFeeling: existingRecord.feeling || '',
        selectedReason: existingRecord.reason || '',
        notes: existingRecord.notes || '',
        actualDistance: existingRecord.distance ? String(existingRecord.distance) : '',
        actualDuration: existingRecord.duration ? String(existingRecord.duration) : ''
      });
    } else {
      this.setData({
        dateKey: date,
        workout: task
      });
    }
  },

  onSelectCompletion(e) {
    this.setData({ selectedCompletion: e.currentTarget.dataset.value });
  },

  onSelectRPE(e) {
    this.setData({ selectedRPE: e.currentTarget.dataset.value });
  },

  onSelectFeeling(e) {
    this.setData({ selectedFeeling: e.currentTarget.dataset.value });
  },

  onSelectReason(e) {
    this.setData({ selectedReason: e.currentTarget.dataset.value });
  },

  onInputNotes(e) {
    this.setData({ notes: e.detail.value });
  },

  onInputDistance(e) {
    this.setData({ actualDistance: e.detail.value });
  },

  onInputDuration(e) {
    this.setData({ actualDuration: e.detail.value });
  },

  onSubmit() {
    const { dateKey, selectedCompletion, selectedRPE, selectedFeeling, selectedReason, notes, actualDistance, actualDuration, workout } = this.data;

    if (!selectedCompletion) {
      wx.showToast({ title: '请选择完成度', icon: 'none' });
      return;
    }

    const state = App.getState();
    const record = {
      dateKey,
      completion: selectedCompletion,
      rpe: selectedRPE,
      feeling: selectedFeeling,
      reason: selectedReason,
      notes,
      distance: actualDistance ? parseFloat(actualDistance) : 0,
      duration: actualDuration ? parseInt(actualDuration) : 0,
      taskType: workout ? workout.type : '',
      taskTitle: workout ? workout.title : '',
      submittedAt: new Date().toISOString()
    };

    state.records = state.records || {};
    state.records[dateKey] = record;
    App.setState(() => state);

    const result = this.buildFeedbackResult(record, state, dateKey);
    this.setData({ showResult: true, result });
  },

  buildFeedbackResult(record, state, dateKey) {
    const parts = {};

    parts.todayEvaluation = this.buildTodayEvaluation(record);
    parts.tomorrowSuggestion = this.buildTomorrowSuggestion(record, state, dateKey);
    parts.weekStrategy = this.buildWeekStrategy(record, state, dateKey);
    parts.needReduce = this.checkNeedReduce(record, state);
    parts.triggerReschedule = this.checkTriggerReschedule(record);
    parts.affectPrediction = this.checkAffectPrediction(record, state);
    parts.trustNote = this.buildTrustNote(record, state);

    return parts;
  },

  buildWeekStrategy(record, state, dateKey) {
    if (record.completion === 'missed') {
      if (record.taskType === 'long') {
        return '长距离是本周核心训练，建议在本周内找个合适的时间补上，但不要连续两天跑长距离。';
      }
      if (record.taskType === 'quality') {
        return '质量课可以跳过，本周重点放在长距离慢跑上。';
      }
      return '这次训练跳过也没关系，本周其他训练照常进行。';
    }

    if (record.feeling === 'discomfort') {
      return '本周以恢复为主，建议把后续质量课改成轻松跑，长距离也可以缩短。';
    }

    if (record.feeling === 'hard' || record.rpe >= 8) {
      return '本周建议减量，后续质量课降级为轻松跑，长距离保持轻松节奏。';
    }

    if (record.completion === 'partial') {
      return '本周保持原计划，不用追补今天的量，稳稳完成每次训练更重要。';
    }

    return '本周按原计划进行，保持训练节奏。';
  },

  buildTrustNote(record, state) {
    const notes = [
      '这份计划会根据你的每次反馈持续调整，不是一成不变的。',
      '你的每次反馈都会影响后续计划，让训练更贴合你的实际情况。',
      '计划不是死的，你的状态才是最重要的参考依据。',
      '错过一次训练不会毁了整个计划，系统会自动帮你调整。'
    ];

    if (record.completion === 'missed') {
      return '错过一次训练不会影响大局，系统会自动调整后续安排，优先保证长距离和关键训练。';
    }

    if (record.feeling === 'hard' || record.rpe >= 8) {
      return '训练感觉累是正常的，系统会根据你的反馈降低后续强度，让身体有时间恢复。';
    }

    if (record.feeling === 'discomfort') {
      return '身体不适时系统会优先安排恢复，不会强行推进训练计划。健康永远第一。';
    }

    return notes[Math.floor(Math.random() * notes.length)];
  },

  buildTodayEvaluation(record) {
    if (record.completion === 'full') {
      if (record.feeling === 'easy') return '今天状态很好，训练完成得不错！';
      if (record.feeling === 'normal') return '训练完成，保持这个节奏。';
      if (record.feeling === 'tired') return '虽然有点累，但还是完成了，不错。';
      if (record.feeling === 'hard') return '今天很辛苦，但坚持完成了。注意恢复。';
      if (record.feeling === 'discomfort') return '身体不适还完成了训练，注意观察后续状态。';
      return '训练完成，辛苦了！';
    }

    if (record.completion === 'partial') {
      return '完成一部分也没关系，不要为了补课而加量。';
    }

    return '没完成也没关系，休息好更重要。';
  },

  buildTomorrowSuggestion(record, state, dateKey) {
    if (record.completion === 'missed') {
      return '明天按原计划训练就好，不要试图补今天的量。';
    }

    if (record.feeling === 'hard' || record.feeling === 'discomfort') {
      return '明天建议降一个强度等级，或者做恢复跑。';
    }

    if (record.rpe >= 8) {
      return '今天强度较大，明天建议轻松跑或休息。';
    }

    if (record.completion === 'partial') {
      return '明天按原计划来，不用追补今天的量。';
    }

    const loadData = calculateTrainingLoad(state.records, dateKey);
    if (loadData.tsb < -20) {
      return '近期疲劳偏高，明天可以适当降低强度。';
    }

    return '明天按计划训练，保持节奏。';
  },

  checkNeedReduce(record, state) {
    if (record.feeling === 'hard' || record.feeling === 'discomfort') return true;
    if (record.rpe >= 8 && record.completion !== 'full') return true;
    return false;
  },

  checkTriggerReschedule(record) {
    if (record.completion === 'missed') return true;
    if (record.feeling === 'discomfort') return true;
    if (record.completion === 'partial' && record.rpe >= 8) return true;
    return false;
  },

  checkAffectPrediction(record, state) {
    if (record.completion === 'missed' && record.taskType === 'long') return true;
    if (record.completion === 'missed' && record.taskType === 'quality') return true;
    if (record.feeling === 'discomfort') return true;
    return false;
  },

  onViewAdjustment() {
    wx.navigateTo({
      url: `/pages/adjustment/index?date=${this.data.dateKey}`
    });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/today/index' });
  }
});
