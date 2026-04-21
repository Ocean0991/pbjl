const { addDays, daysBetween, getDayKey, getTodayKey } = require('../../utils/date');
const {
  buildNextStateAfterRebuildPlan,
  buildNextStateAfterQuickStatus,
  buildNextStateForPlanRisk,
  buildRiskSnapshot,
  buildWeeklyReview,
  getGoalLabel,
  getTaskForDate,
  summarizeWeek,
  buildMotivationText
} = require('../../utils/training-engine');
const {
  buildSharePayload,
  getFavoriteGuideSteps,
  getMiniProgramGuideSteps,
  getPendingFavoriteGuide,
  getPendingMiniProgramGuide,
  markGuideShown,
  prepareShareMenu,
  recordFavoriteCallback,
  recordShare,
  registerHomeVisit
} = require('../../utils/wechat-ecosystem');

const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    showLanding: false,
    profile: null,
    plan: null,
    todayTask: null,
    weekSummary: {
      week: {
        index: 1
      },
      completedCount: 0,
      partialCount: 0,
      missedCount: 0,
      completionRate: 0,
      longRunDone: false
    },
    riskSnapshot: {
      level: 'low',
      label: '低风险',
      messages: []
    },
    latestAdjustment: null,
    raceDaysLeft: 0,
    goalLabel: '',
    progressWidth: 0,
    completedDisplay: 0,
    currentWeekIndex: 1,
    isBlocked: false,
    raceNameDisplay: '首场半程马拉松',
    modeLabel: '待生成计划',
    riskClass: '',
    planRiskCard: null,
    weeklyReview: null,
    planBasisNote: '',
    isRestDay: false,
    todayRecord: null,
    showQuickStatus: true,
    todayActionButtonText: '训练后去打卡',
    weeklyCardTitle: '本周只看这几个信号',
    weeklyCardItems: [],
    weeklySuggestion: '',
    weeklyMetaText: '',
    todayFeedbackText: '',
    pendingGuide: null,
    sharePrompt: null,
    showTaskDetailSheet: false,
    showAdjustmentSheet: false,
    currentWeekNumber: 1,
    weeklyCompletedCount: 0,
    riskLevelText: '正常',
    weeklyProgressPercent: 0,
    motivationText: '',
    trainingPhaseLabel: '',
    hasTodayFeedback: false,
    todayKey: '',
    predictionChangeText: ''
  },

  onShow() {
    let state = app.getState();

    if (!state.profile) {
      wx.setNavigationBarTitle({
        title: '首场半马陪跑'
      });
      this.setData({
        themeClass: app.getThemeClass(),
        showLanding: true
      });
      return;
    }

    wx.setNavigationBarTitle({
      title: '今日训练'
    });

    state = registerHomeVisit(state);
    app.setState(() => state);
    prepareShareMenu();

    const todayKey = getTodayKey();
    const weekSummary = state.plan ? summarizeWeek(state.plan, state.records, todayKey) : null;
    const plannedCount = weekSummary ? weekSummary.plannedCount || 1 : 1;
    const score = weekSummary ? weekSummary.completedCount + weekSummary.partialCount : 0;
    const riskSnapshot = buildRiskSnapshot(state, todayKey);
    const todayTask = state.plan ? getTaskForDate(state.plan, todayKey) : null;
    const weeklyReview = buildWeeklyReview(state.plan, state.records, todayKey, riskSnapshot);
    const todayRecord = state.records[todayKey] || null;
    const hasTodayFeedback = Boolean(todayRecord);
    const hasTodayAdjustment = Boolean(state.latestAdjustment && state.latestAdjustment.dateKey === todayKey);
    const weeklyCardItems =
      weeklyReview && weeklyReview.show
        ? weeklyReview.items
        : [
            `本周完成度 ${weekSummary ? weekSummary.completionRate : 0}%`,
            weekSummary && weekSummary.longRunDone ? '这周最关键的长距离已经完成了' : '这周最关键的长距离还没完成',
            riskSnapshot.messages && riskSnapshot.messages.length ? riskSnapshot.messages[0] : '这周先把训练节奏稳住，不要乱补课。'
          ];
    const weeklySuggestion =
      weeklyReview && weeklyReview.nextSuggestion
        ? weeklyReview.nextSuggestion
        : riskSnapshot.nextStep || '这周先保长距离和恢复，其他训练都可以给它让路。';
    const weeklyMetaText =
      weeklyReview && weeklyReview.show
        ? `${weeklyReview.completionText} · ${weeklyReview.riskText}`
        : `${weekSummary ? weekSummary.completedCount + weekSummary.partialCount : 0}/${weekSummary ? weekSummary.plannedCount || 0 : 0} 次训练已记录`;
    const todayFeedbackText = todayRecord ? this.getTodayFeedbackText(todayRecord) : '';
    const todayActionButtonText =
      hasTodayFeedback && hasTodayAdjustment
        ? '查看今天建议'
        : todayTask && todayTask.type === 'rest'
          ? '看看本周计划'
          : '训练后去打卡';

    this.setData({
      themeClass: app.getThemeClass(),
      showLanding: false,
      profile: state.profile,
      plan: state.plan,
      todayTask,
      weekSummary,
      riskSnapshot,
      latestAdjustment: state.latestAdjustment,
      raceDaysLeft: state.profile ? daysBetween(todayKey, state.profile.raceDate) : 0,
      goalLabel: state.planState ? getGoalLabel(state.planState.currentGoalType) : state.plan ? getGoalLabel(state.plan.currentGoal) : '',
      progressWidth: weekSummary ? weekSummary.completionRate : Math.min(100, Math.round((score / plannedCount) * 100)),
      completedDisplay: score,
      currentWeekIndex: weekSummary && weekSummary.week ? weekSummary.week.index : 1,
      isBlocked: Boolean(state.plan && state.plan.mode === 'blocked'),
      raceNameDisplay: state.profile.raceName || '首场半程马拉松',
      modeLabel: state.plan ? state.plan.modeLabel : '待生成计划',
      riskClass: riskSnapshot.level === 'high' ? 'badge-risk' : riskSnapshot.level === 'medium' ? 'badge-warn' : '',
      planRiskCard: riskSnapshot.showPlanRiskCard
        ? {
            title: riskSnapshot.cardTitle,
            description: riskSnapshot.cardDescription,
            currentAdvice: riskSnapshot.cardCurrentAdvice
          }
        : null,
      weeklyReview,
      planBasisNote: state.plan ? state.plan.planBasisNote : '',
      isRestDay: Boolean(todayTask && todayTask.type === 'rest'),
      todayRecord,
      showQuickStatus: !Boolean(state.plan && state.plan.mode === 'blocked') && !hasTodayFeedback,
      todayActionButtonText,
      weeklyCardTitle: weeklyReview && weeklyReview.show ? weeklyReview.label : '本周只看这几个信号',
      weeklyCardItems,
      weeklySuggestion,
      weeklyMetaText,
      todayFeedbackText,
      pendingGuide: this.detectPendingGuide(state),
      currentWeekNumber: weekSummary && weekSummary.week ? weekSummary.week.index : 1,
      weeklyCompletedCount: weekSummary ? weekSummary.completedCount + weekSummary.partialCount : 0,
      riskLevelText: riskSnapshot.level === 'high' ? '高风险' : riskSnapshot.level === 'medium' ? '中风险' : '正常',
      weeklyProgressPercent: weekSummary ? weekSummary.completionRate : 0,
      motivationText: buildMotivationText(todayTask, riskSnapshot, state.profile ? daysBetween(todayKey, state.profile.raceDate) : 0),
      trainingPhaseLabel: this.buildTrainingPhaseLabel(state.plan, todayKey),
      hasTodayFeedback,
      todayKey,
      predictionChangeText: this.buildPredictionChangeText(state)
    });

    this.checkSharePrompt(state);
  },

  startSetup() {
    app.globalData.setupDraft = {
      displayName: '',
      gender: '',
      birthYear: '',
      symptomStatus: 'steady',
      injuryStatus: 'none',
      heightCm: '',
      weightKg: '',
      maxHeartRate: '',
      restingHeartRate: '',
      lactateThresholdHr: '',
      vo2Max: '',
      hrv: '',
      sleepHours: '',
      raceDate: getDayKey(addDays(new Date(), 70)),
      raceName: '',
      longestRunKm: '',
      recentWeeklyRuns: '',
      recentWeeklyMileage: '',
      hasRun10k: false,
      trainingDaysPerWeek: 3,
      goalType: 'steady'
    };

    wx.navigateTo({
      url: '/pages/profile/index'
    });
  },

  openIntro() {
    wx.navigateTo({
      url: '/pages/welcome/index'
    });
  },
  getTodayFeedbackText(record) {
    const completionLabels = {
      full: '完成了',
      partial: '完成一部分',
      missed: '没完成'
    };
    const feelingLabels = {
      easy: '轻松',
      normal: '正常',
      tired: '有点累',
      very_tired: '很累',
      discomfort: '有不适'
    };

    return `今天已记录：${completionLabels[record.completion] || '已反馈'} · ${feelingLabels[record.feeling] || '已记录感觉'}`;
  },

  detectPendingGuide(state) {
    const miniGuide = getPendingMiniProgramGuide(state);
    if (miniGuide) {
      return {
        type: 'mini_program',
        reason: miniGuide.reason,
        title: miniGuide.title,
        body: miniGuide.body,
        actionText: miniGuide.actionText
      };
    }

    const favGuide = getPendingFavoriteGuide(state, 'home');
    if (favGuide) {
      return {
        type: 'favorite',
        reason: favGuide.reason,
        title: favGuide.title,
        body: favGuide.body,
        actionText: '看看怎么收藏'
      };
    }

    return null;
  },

  handleGuideAction() {
    const guide = this.data.pendingGuide;
    if (!guide) {
      return;
    }

    const nextState = markGuideShown(app.getState(), guide.type, guide.reason);
    app.setState(() => nextState);

    if (guide.type === 'mini_program') {
      wx.showModal({
        title: '添加到我的小程序',
        content: getMiniProgramGuideSteps().join('\n'),
        showCancel: false,
        confirmText: '知道了'
      });
    }

    if (guide.type === 'favorite') {
      wx.showModal({
        title: '收藏今日训练页',
        content: getFavoriteGuideSteps('今日训练').join('\n'),
        showCancel: false,
        confirmText: '知道了'
      });
    }

    this.setData({
      pendingGuide: null
    });
  },

  dismissGuide() {
    const guide = this.data.pendingGuide;
    if (!guide) {
      return;
    }

    const nextState = markGuideShown(app.getState(), guide.type, guide.reason);
    app.setState(() => nextState);
    this.setData({
      pendingGuide: null
    });
  },

  checkSharePrompt(state) {
    const ecosystem = state.ecosystem || {};
    const todayKey = getTodayKey();
    const daysToRace = state.profile ? daysBetween(todayKey, state.profile.raceDate) : 999;

    if (ecosystem.firstWeekCompletedAt && !ecosystem.hasSharedFirstWeek) {
      this.setData({
        sharePrompt: {
          scenario: 'first_week',
          title: '第一周练完了',
          body: '如果你觉得这个小程序帮到了你，可以告诉也在准备首场半马的朋友。'
        }
      });
      return;
    }

    if (ecosystem.firstLongRunCompletedAt && !ecosystem.hasSharedFirstLongRun) {
      this.setData({
        sharePrompt: {
          scenario: 'first_long_run',
          title: '第一次关键长距离完成了',
          body: '这是训练里最重要的一步，值得告诉朋友你守住了。'
        }
      });
      return;
    }

    if (daysToRace === 21 && !ecosystem.hasSharedCountdown21) {
      this.setData({
        sharePrompt: {
          scenario: 'countdown_21',
          title: '距离比赛还有 21 天',
          body: '你已经坚持到这里了，让朋友知道你还在稳稳往前跑。'
        }
      });
      return;
    }
  },

  handleSharePrompt() {
    const prompt = this.data.sharePrompt;
    if (!prompt) {
      return;
    }

    const state = app.getState();
    const nextState = Object.assign({}, state);
    nextState.ecosystem = Object.assign({}, nextState.ecosystem);

    if (prompt.scenario === 'first_week') {
      nextState.ecosystem.hasSharedFirstWeek = true;
    } else if (prompt.scenario === 'first_long_run') {
      nextState.ecosystem.hasSharedFirstLongRun = true;
    } else if (prompt.scenario === 'countdown_21') {
      nextState.ecosystem.hasSharedCountdown21 = true;
    }

    app.setState(() => nextState);
    this.setData({
      sharePrompt: null
    });
  },

  dismissSharePrompt() {
    const prompt = this.data.sharePrompt;
    if (!prompt) {
      return;
    }

    const state = app.getState();
    const nextState = Object.assign({}, state);
    nextState.ecosystem = Object.assign({}, nextState.ecosystem);

    if (prompt.scenario === 'first_week') {
      nextState.ecosystem.hasSharedFirstWeek = true;
    } else if (prompt.scenario === 'first_long_run') {
      nextState.ecosystem.hasSharedFirstLongRun = true;
    } else if (prompt.scenario === 'countdown_21') {
      nextState.ecosystem.hasSharedCountdown21 = true;
    }

    app.setState(() => nextState);
    this.setData({
      sharePrompt: null
    });
  },

  handleQuickStatus(event) {
    if (this.data.isBlocked) {
      return;
    }

    const status = event.currentTarget.dataset.status;
    const result = buildNextStateAfterQuickStatus(app.getState(), status, getTodayKey());

    app.setState(() => result.nextState);

    wx.navigateTo({
      url: `/pages/adjustment/index?from=quick&status=${status}`
    });
  },

  goCheckin() {
    wx.navigateTo({
      url: '/pages/checkin/index'
    });
  },

  handleTodayAction() {
    const todayKey = getTodayKey();

    if (this.data.todayRecord && this.data.latestAdjustment && this.data.latestAdjustment.dateKey === todayKey) {
      wx.navigateTo({
        url: `/pages/adjustment/index?from=home&date=${todayKey}`
      });
      return;
    }

    if (this.data.isRestDay) {
      wx.switchTab({
        url: '/pages/plan/index'
      });
      return;
    }

    this.goCheckin();
  },

  viewPlanRisk() {
    const result = buildNextStateForPlanRisk(app.getState(), getTodayKey());
    app.setState(() => result.nextState);

    wx.navigateTo({
      url: '/pages/adjustment/index?from=plan-risk'
    });
  },

  rebuildPlan() {
    const state = app.getState();
    const riskSnapshot = buildRiskSnapshot(state, getTodayKey());

    if (!riskSnapshot.showPlanRiskCard) {
      return;
    }

    wx.showModal({
      title: '重组后续计划',
      content: `系统会按“${riskSnapshot.recommendedGoalLabel}”重算后面的训练安排，已完成记录会保留。`,
      confirmText: '开始重组',
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        const rebuilt = buildNextStateAfterRebuildPlan(state, getTodayKey(), {
          goalType: riskSnapshot.recommendedGoalType
        });

        app.setState(() => rebuilt.nextState);

        wx.switchTab({
          url: '/pages/plan/index'
        });
      }
    });
  },

  onShareAppMessage() {
    const payload = buildSharePayload(app.getState(), 'home');
    const nextState = recordShare(app.getState(), 'friend', 'home');
    app.setState(() => nextState);

    return {
      title: payload.title,
      path: payload.path,
      desc: payload.desc
    };
  },

  onShareTimeline() {
    const payload = buildSharePayload(app.getState(), 'home');
    const nextState = recordShare(app.getState(), 'timeline', 'home');
    app.setState(() => nextState);

    return {
      title: payload.title,
      query: payload.query
    };
  },

  onAddToFavorites() {
    const nextState = recordFavoriteCallback(app.getState(), 'home');
    app.setState(() => nextState);

    return {
      title: '今日训练 | 首场赛事陪跑',
      query: 'favorite=home'
    };
  },

  showTaskDetail() {
    this.setData({
      showTaskDetailSheet: true
    });
  },

  hideTaskDetail() {
    this.setData({
      showTaskDetailSheet: false
    });
  },

  showAdjustmentDetail() {
    this.setData({
      showAdjustmentSheet: true
    });
  },

  hideAdjustmentDetail() {
    this.setData({
      showAdjustmentSheet: false
    });
  },

  openMe() {
    wx.switchTab({
      url: '/pages/me/index'
    });
  },

  openWorkoutDetail() {
    wx.navigateTo({
      url: '/pages/workout-detail/index?date=' + getTodayKey()
    });
  },

  buildTrainingPhaseLabel(plan, todayKey) {
    if (!plan || !plan.weeks || !plan.weeks.length) return '';
    const currentWeek = plan.weeks.find(function(w) {
      return todayKey >= w.startDate && todayKey <= w.endDate;
    });
    if (!currentWeek) return '';
    return currentWeek.phase || '';
  },

  buildPredictionChangeText(state) {
    if (!state.planState || !state.planState.predictionChange) return '';
    const change = state.planState.predictionChange;
    if (change.direction === 'up') {
      return '根据你近期的训练表现，目标成绩预测有所上调。继续保持当前节奏。';
    }
    if (change.direction === 'down') {
      return '根据你近期的训练反馈，目标成绩预测有所下调。这不是坏事，稳住节奏更重要。';
    }
    return '';
  }
});
