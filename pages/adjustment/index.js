const App = getApp();
const { formatDate } = require('../../utils/util');
const { reschedulePlan, generateRescheduleActions } = require('../../utils/calendar-reschedule-engine');

Page({
  data: {
    dateKey: '',
    record: null,
    workout: null,
    adjustmentResult: null,
    movedItems: [],
    downgradedItems: [],
    deletedItems: [],
    reasonText: '',
    accepted: false
  },

  onLoad(options) {
    const date = options.date || formatDate(new Date());
    this.loadAdjustmentData(date);
  },

  loadAdjustmentData(date) {
    const state = App.getState();
    if (!state.records || !state.records[date]) {
      wx.showToast({ title: '未找到反馈记录', icon: 'none' });
      return;
    }

    const record = state.records[date];
    const workout = state.plan && state.plan.tasksByDate ? state.plan.tasksByDate[date] : null;

    let adjustmentResult = null;

    try {
      const adjustments = [{
        dateKey: date,
        action: record.completion === 'missed' ? 'skip' : 'reduce',
        reason: record.reason || record.feeling || '用户反馈'
      }];

      const newPlan = reschedulePlan(state.plan, state.records, adjustments, date);
      const actions = generateRescheduleActions(state.plan, state.records, adjustments, date);

      if (actions && actions.length > 0) {
        const nextState = JSON.parse(JSON.stringify(state));
        nextState.plan = newPlan;

        const movedItems = actions.filter(a => a.action === 'move' || a.action === 'moved');
        const downgradedItems = actions.filter(a => a.action === 'downgrade' || a.action === 'downgraded');
        const deletedItems = actions.filter(a => a.action === 'delete' || a.action === 'deleted');

        adjustmentResult = {
          nextState,
          changes: actions.map(a => ({
            action: a.action,
            title: a.title || a.workoutTitle || '训练',
            dateKey: a.dateKey || a.targetDate,
            fromDate: a.fromDate || a.originalDate,
            toDate: a.toDate || a.targetDate,
            fromType: a.fromType || a.originalType,
            toType: a.toType || a.newType,
            reason: a.reason || ''
          })),
          reason: this.buildReasonText(record, actions)
        };

        this.setData({
          dateKey: date,
          record,
          workout,
          adjustmentResult,
          movedItems,
          downgradedItems,
          deletedItems,
          reasonText: adjustmentResult.reason
        });
      } else {
        this.setData({
          dateKey: date,
          record,
          workout,
          reasonText: '当前情况不需要调整计划。'
        });
      }
    } catch (e) {
      this.setData({
        dateKey: date,
        record,
        workout,
        reasonText: '根据你的反馈，建议适当降低后续训练强度。'
      });
    }
  },

  buildReasonText(record, actions) {
    if (record.completion === 'missed') {
      return '你跳过了今天的训练，系统已调整后续安排，优先保留长距离和关键训练。';
    }
    if (record.feeling === 'discomfort') {
      return '你反馈身体不适，系统已降低后续训练强度，优先保证恢复。';
    }
    if (record.feeling === 'hard' || record.rpe >= 8) {
      return '你反馈训练偏累，系统已适当降低后续强度。';
    }
    if (record.completion === 'partial') {
      return '你只完成了部分训练，系统已调整后续安排。';
    }
    return '根据你的反馈，系统已调整后续训练安排。';
  },

  onAccept() {
    const { adjustmentResult } = this.data;
    if (!adjustmentResult || !adjustmentResult.nextState) {
      wx.showToast({ title: '无需调整', icon: 'none' });
      wx.switchTab({ url: '/pages/today/index' });
      return;
    }

    App.setState(() => adjustmentResult.nextState);
    this.setData({ accepted: true });

    wx.showToast({ title: '已接受调整', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/today/index' });
    }, 1500);
  },

  onReject() {
    wx.showModal({
      title: '保持原计划',
      content: '确定不接受调整建议吗？原计划可能不适合当前状态。',
      confirmText: '保持原计划',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/today/index' });
        }
      }
    });
  }
});
