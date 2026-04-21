const App = getApp();
const { formatDate, getWeekNumber } = require('../../utils/util');
const { getTaskForDate, summarizeWeek, getCurrentWeek } = require('../../utils/training-engine');
const { generateCoachAdvice, generateDailyDirection } = require('../../utils/coach-advisor');

Page({
  data: {
    currentDate: '',
    todayWorkout: null,
    weekSummary: null,
    raceCountdown: 0,
    coachAdvice: null,
    dailyDirection: null,
    statusLevel: 'good',
    statusTitle: '状态正常',
    statusDesc: '按计划训练即可',
    metrics: {
      completionRate: 0,
      longRunCount: 0,
      longRunTarget: 0,
      fatigueLevel: '正常'
    },
    showWarning: false,
    warningTitle: '',
    warningDesc: ''
  },

  onLoad() {
    this.loadTodayData();
  },

  onShow() {
    this.loadTodayData();
  },

  loadTodayData() {
    const state = App.getState();
    if (!state.profile || !state.plan) {
      wx.redirectTo({ url: '/pages/onboarding/index' });
      return;
    }

    const today = formatDate(new Date());
    const todayWorkout = getTaskForDate(state.plan, today);
    const weekSummary = this.calculateWeekSummary(state, today);
    const raceCountdown = this.calculateRaceCountdown(state.profile.raceDate);
    const coachAdvice = generateCoachAdvice(state.profile, state.plan, state.records, today);
    const dailyDirection = generateDailyDirection(state.profile, state.plan, state.records, today);
    
    const statusInfo = this.calculateStatus(state, today, raceCountdown);
    const warningInfo = this.checkWarnings(state, today, raceCountdown);

    this.setData({
      currentDate: today,
      todayWorkout,
      weekSummary,
      raceCountdown,
      coachAdvice,
      dailyDirection,
      ...statusInfo,
      ...warningInfo
    });
  },

  calculateStatus(state, today, raceCountdown) {
    const records = state.records || {};
    const plan = state.plan;
    
    let completedCount = 0;
    let plannedCount = 0;
    let longRunCount = 0;
    let longRunTarget = 0;
    let missedLongRun = 0;
    let recentRPE = [];
    
    const startDate = new Date(plan.startDate);
    const todayDate = new Date(today);
    const totalDays = Math.floor((todayDate - startDate) / (1000 * 60 * 60 * 24));
    const weeksElapsed = Math.floor(totalDays / 7) + 1;
    
    longRunTarget = Math.min(weeksElapsed, plan.totalWeeks || 12);
    
    Object.keys(records).forEach(date => {
      const record = records[date];
      if (record.completion !== 'missed') {
        completedCount++;
        if (record.taskType === 'long') {
          longRunCount++;
        }
      }
      plannedCount++;
      if (record.completion === 'missed' && record.taskType === 'long') {
        missedLongRun++;
      }
      if (record.rpe && record.rpe >= 7) {
        recentRPE.push(record.rpe);
      }
    });
    
    const completionRate = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 100;
    
    let fatigueLevel = '正常';
    if (recentRPE.length >= 3) {
      const avgRPE = recentRPE.reduce((a, b) => a + b, 0) / recentRPE.length;
      if (avgRPE >= 8) fatigueLevel = '偏高';
      else if (avgRPE >= 7) fatigueLevel = '略高';
    }
    
    let statusLevel = 'good';
    let statusTitle = '状态正常';
    let statusDesc = '按计划训练即可';
    
    if (missedLongRun >= 2) {
      statusLevel = 'danger';
      statusTitle = '长距离缺练较多';
      statusDesc = '建议调整目标或找时间补上长距离';
    } else if (completionRate < 50) {
      statusLevel = 'danger';
      statusTitle = '训练完成率偏低';
      statusDesc = '可能需要调整目标或训练频率';
    } else if (missedLongRun >= 1 || completionRate < 70) {
      statusLevel = 'warning';
      statusTitle = '需要关注';
      statusDesc = '建议优先保证长距离训练';
    } else if (fatigueLevel === '偏高') {
      statusLevel = 'warning';
      statusTitle = '疲劳累积较多';
      statusDesc = '建议本周降低强度，多休息';
    } else if (raceCountdown <= 14 && raceCountdown > 7) {
      statusLevel = 'good';
      statusTitle = '赛前两周';
      statusDesc = '开始减量，保持状态';
    } else if (raceCountdown <= 7) {
      statusLevel = 'good';
      statusTitle = '比赛周';
      statusDesc = '轻松活动，蓄力待发';
    }
    
    return {
      statusLevel,
      statusTitle,
      statusDesc,
      metrics: {
        completionRate,
        longRunCount,
        longRunTarget,
        fatigueLevel
      }
    };
  },

  checkWarnings(state, today, raceCountdown) {
    const records = state.records || {};
    const warnings = [];
    
    const recentDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      recentDates.push(formatDate(d));
    }
    
    let consecutiveMissed = 0;
    for (const date of recentDates) {
      const record = records[date];
      if (record && record.completion === 'missed') {
        consecutiveMissed++;
      } else {
        break;
      }
    }
    
    if (consecutiveMissed >= 3) {
      return {
        showWarning: true,
        warningTitle: '连续缺练较多',
        warningDesc: '不要试图一次性补回来，今天按计划训练就好。错过的不用追，稳住后面的。'
      };
    }
    
    let recentHardCount = 0;
    recentDates.slice(0, 5).forEach(date => {
      const record = records[date];
      if (record && (record.rpe >= 8 || record.feeling === 'hard' || record.feeling === 'discomfort')) {
        recentHardCount++;
      }
    });
    
    if (recentHardCount >= 3) {
      return {
        showWarning: true,
        warningTitle: '近期训练偏累',
        warningDesc: '身体需要恢复时间。今天建议降成轻松跑或休息，不要硬顶。'
      };
    }
    
    if (raceCountdown <= 7) {
      const todayRecord = records[today];
      if (todayRecord && todayRecord.taskType === 'quality') {
        return {
          showWarning: true,
          warningTitle: '比赛周不建议上强度',
          warningDesc: '这周的重点是保持状态，不是提升能力。建议把质量课改成轻松跑。'
        };
      }
    }
    
    return {
      showWarning: false,
      warningTitle: '',
      warningDesc: ''
    };
  },

  calculateWeekSummary(state, today) {
    const summary = summarizeWeek(state.plan, state.records, today);
    const currentWeek = getCurrentWeek(state.plan, today);

    return {
      weekNumber: currentWeek ? currentWeek.index : 1,
      phase: currentWeek ? currentWeek.phase : '基础期',
      completedCount: summary.completedCount,
      totalDays: summary.plannedCount,
      totalDistance: this.calculateWeekDistance(state.plan, currentWeek),
      completionRate: summary.completionRate,
      longRunDone: summary.longRunDone
    };
  },

  calculateWeekDistance(plan, week) {
    if (!week || !week.days) return 0;
    let totalDistance = 0;
    week.days.forEach(day => {
      if (day.distance) totalDistance += day.distance;
    });
    return totalDistance.toFixed(1);
  },

  calculateRaceCountdown(raceDate) {
    if (!raceDate) return 0;
    const today = new Date();
    const race = new Date(raceDate);
    const diff = race - today;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  onStartWorkout() {
    wx.navigateTo({
      url: `/pages/workout-detail/index?date=${this.data.currentDate}`
    });
  },

  onOpenRaceGuide() {
    wx.navigateTo({ url: '/pages/race-guide/index' });
  },

  onViewPlan() {
    wx.switchTab({ url: '/pages/plan/index' });
  },

  onOpenAICoach() {
    wx.navigateTo({ url: '/pages/ai-coach/index' });
  },

  onViewPrediction() {
    wx.navigateTo({ url: '/pages/prediction/index' });
  },

  onViewWeeklyReview() {
    wx.navigateTo({ url: '/pages/weekly-review/index' });
  },

  onShareAppMessage() {
    const { todayWorkout } = this.data;
    return {
      title: todayWorkout ? `今天训练：${todayWorkout.title}` : '我的跑步训练',
      path: '/pages/today/index'
    };
  }
});
