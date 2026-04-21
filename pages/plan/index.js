const App = getApp();
const { formatDate, addDays, getWeekNumber } = require('../../utils/util');
const { getTaskForDate, getCurrentWeek, summarizeWeek, rescheduleAfterBlackout } = require('../../utils/training-engine');

Page({
  data: {
    currentMonth: '',
    currentYear: 2024,
    currentMonthIndex: 1,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    currentWeekNumber: 1,
    currentPhase: '基础期',
    weekWorkouts: [],
    totalWeeks: 12,
    raceCountdown: 0,
    selectedDate: '',
    blackoutDates: [],
    showBlackoutSheet: false,
    blackoutDateInput: '',
    showRescheduleConfirm: false,
    rescheduleInfo: null,
    longPressDate: ''
  },

  onLoad() {
    this.initializeCalendar();
  },

  onShow() {
    this.loadPlanData();
  },

  initializeCalendar() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();

    this.setData({
      currentYear,
      currentMonthIndex,
      currentMonth: this.formatMonth(currentYear, currentMonthIndex),
      selectedDate: formatDate(today)
    });

    this.generateCalendarDays(currentYear, currentMonthIndex);
  },

  formatMonth(year, monthIndex) {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'];
    return `${year}年 ${months[monthIndex]}`;
  },

  generateCalendarDays(year, monthIndex) {
    const state = App.getState();
    const today = formatDate(new Date());
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const blackoutDates = state.profile ? (state.profile.blackoutDates || []) : [];

    const calendarDays = [];

    for (let i = 0; i < startDay; i++) {
      const prevDate = addDays(firstDay, -startDay + i);
      const dateKey = formatDate(prevDate);
      calendarDays.push({
        dateKey,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        hasWorkout: false,
        workoutType: '',
        isCompleted: false,
        isBlackout: blackoutDates.includes(dateKey)
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, monthIndex, i);
      const dateKey = formatDate(date);
      const task = state.plan ? getTaskForDate(state.plan, dateKey) : null;
      const record = state.records ? state.records[dateKey] : null;

      calendarDays.push({
        dateKey,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateKey === today,
        hasWorkout: task && task.trackable,
        workoutType: task ? task.type : '',
        isCompleted: record && record.completion !== 'missed',
        isBlackout: blackoutDates.includes(dateKey)
      });
    }

    const remainingDays = 42 - calendarDays.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = addDays(lastDay, i);
      const dateKey = formatDate(nextDate);
      calendarDays.push({
        dateKey,
        dayNumber: nextDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        hasWorkout: false,
        workoutType: '',
        isCompleted: false,
        isBlackout: blackoutDates.includes(dateKey)
      });
    }

    this.setData({ calendarDays, blackoutDates });
  },

  loadPlanData() {
    const state = App.getState();
    if (!state.plan) return;

    const today = formatDate(new Date());
    const currentWeek = getCurrentWeek(state.plan, today);

    if (currentWeek) {
      this.setData({
        currentWeekNumber: currentWeek.index,
        currentPhase: currentWeek.phase || '基础期',
        totalWeeks: state.plan.totalWeeks || 12
      });

      this.loadWeekWorkouts(currentWeek);
    }

    if (state.profile && state.profile.raceDate) {
      const raceDate = state.profile.raceDate;
      const todayDate = new Date();
      const race = new Date(raceDate);
      const diffTime = race - todayDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      this.setData({
        raceCountdown: diffDays > 0 ? diffDays : 0
      });
    }
  },

  loadWeekWorkouts(week) {
    const state = App.getState();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const typeLabels = {
      easy: '轻松跑', long: '长距离', quality: '质量课',
      recovery: '恢复跑', strength: '力量训练', rest: '休息',
      cross: '交叉训练', mobility: '灵活性恢复', race: '比赛日'
    };

    const weekWorkouts = week.days.map(day => {
      const date = new Date(day.dateKey);
      const record = state.records ? state.records[day.dateKey] : null;

      return {
        dateKey: day.dateKey,
        weekday: weekdays[date.getDay()],
        dayNumber: date.getDate(),
        type: day.type,
        typeLabel: typeLabels[day.type] || day.title,
        title: day.title,
        target: day.target,
        isToday: day.dateKey === formatDate(new Date()),
        isCompleted: record && record.completion !== 'missed',
        isMissed: record && record.completion === 'missed'
      };
    });

    this.setData({ weekWorkouts });
  },

  onPrevMonth() {
    let { currentYear, currentMonthIndex } = this.data;

    currentMonthIndex--;
    if (currentMonthIndex < 0) {
      currentMonthIndex = 11;
      currentYear--;
    }

    this.setData({
      currentYear,
      currentMonthIndex,
      currentMonth: this.formatMonth(currentYear, currentMonthIndex)
    });

    this.generateCalendarDays(currentYear, currentMonthIndex);
  },

  onNextMonth() {
    let { currentYear, currentMonthIndex } = this.data;

    currentMonthIndex++;
    if (currentMonthIndex > 11) {
      currentMonthIndex = 0;
      currentYear++;
    }

    this.setData({
      currentYear,
      currentMonthIndex,
      currentMonth: this.formatMonth(currentYear, currentMonthIndex)
    });

    this.generateCalendarDays(currentYear, currentMonthIndex);
  },

  onSelectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });

    wx.navigateTo({
      url: `/pages/workout-detail/index?date=${date}`
    });
  },

  onLongPressDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({
      longPressDate: date,
      showBlackoutSheet: true
    });
  },

  onAddBlackout() {
    const { longPressDate, blackoutDates } = this.data;
    if (blackoutDates.includes(longPressDate)) {
      wx.showToast({ title: '该日期已是黑名单', icon: 'none' });
      return;
    }

    const newBlackoutDates = [...blackoutDates, longPressDate];
    this.saveBlackoutDates(newBlackoutDates);
    this.setData({ showBlackoutSheet: false });

    wx.showToast({ title: '已添加黑名单日期', icon: 'success' });
    this.generateCalendarDays(this.data.currentYear, this.data.currentMonthIndex);
  },

  onRemoveBlackout() {
    const { longPressDate, blackoutDates } = this.data;
    const newBlackoutDates = blackoutDates.filter(d => d !== longPressDate);
    this.saveBlackoutDates(newBlackoutDates);
    this.setData({ showBlackoutSheet: false });

    wx.showToast({ title: '已移除黑名单日期', icon: 'success' });
    this.generateCalendarDays(this.data.currentYear, this.data.currentMonthIndex);
  },

  onCloseBlackoutSheet() {
    this.setData({ showBlackoutSheet: false });
  },

  saveBlackoutDates(dates) {
    const state = App.getState();
    state.profile = state.profile || {};
    state.profile.blackoutDates = dates;
    App.setState(() => state);
    this.setData({ blackoutDates: dates });
  },

  onReschedule() {
    const state = App.getState();
    if (!state.plan) return;

    const result = rescheduleAfterBlackout(state);
    if (result && result.nextState) {
      App.setState(() => result.nextState);
      this.setData({ showBlackoutSheet: false });
      wx.showToast({ title: '计划已重新安排', icon: 'success' });
      this.loadPlanData();
      this.generateCalendarDays(this.data.currentYear, this.data.currentMonthIndex);
    } else {
      wx.showToast({ title: '无需调整', icon: 'none' });
    }
  },

  onViewWorkout(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/pages/workout-detail/index?date=${date}`
    });
  }
});
