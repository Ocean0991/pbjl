const { daysBetween, getTodayKey } = require('../../utils/date');
const { getCurrentWeek, getGoalLabel } = require('../../utils/training-engine');
const {
  buildSharePayload,
  getMiniProgramGuideSteps,
  markGuideShown,
  prepareShareMenu,
  recordShare
} = require('../../utils/wechat-ecosystem');

const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    profile: null,
    plan: null,
    planState: null,
    screening: null,
    latestAdjustment: null,
    currentWeek: null,
    goalLabel: '',
    raceDaysLeft: 0,
    isBlocked: false,
    resultTitle: '',
    resultBody: '',
    priorityTitle: '',
    priorityBody: '',
    priorityHint: '',
    trustBody: '',
    trustCaption: '',
    matchingTitle: '',
    matchingFactors: []
  },

  onShow() {
    const state = app.getState();
    if (!state.profile || !state.plan || !state.screening) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    prepareShareMenu();

    const todayKey = getTodayKey();
    const currentWeek = getCurrentWeek(state.plan, todayKey);
    const longTask = currentWeek && currentWeek.days ? currentWeek.days.find((task) => task.type === 'long') : null;
    const isBlocked = state.plan.mode === 'blocked';

    this.setData({
      themeClass: app.getThemeClass(),
      profile: state.profile,
      plan: state.plan,
      planState: state.planState,
      screening: state.screening,
      latestAdjustment: state.latestAdjustment,
      currentWeek,
      goalLabel: state.planState ? getGoalLabel(state.planState.currentGoalType) : '',
      raceDaysLeft: daysBetween(todayKey, state.profile.raceDate),
      isBlocked,
      resultTitle: isBlocked ? '这次先别直接进标准计划' : '你的首场半马计划已经准备好了',
      resultBody: isBlocked
        ? '筛查里已经出现了需要先稳一稳的信号，所以这一版不会直接把你推进标准训练。'
        : `接下来你会看到的是一份偏${state.planState && state.planState.currentGoalType === 'standard_finish' ? '稳妥' : '保守'}的首次半马计划，不需要你自己再拼课表。`,
      priorityTitle: isBlocked ? '现在先这样做' : '这一周先守住什么',
      priorityBody: isBlocked
        ? (state.latestAdjustment ? state.latestAdjustment.todayAction : '先暂停进入标准训练。')
        : longTask
          ? `${longTask.title} · ${longTask.target}`
          : currentWeek
            ? currentWeek.focus
            : '先从今天的训练建议开始看。',
      priorityHint: isBlocked
        ? (state.latestAdjustment ? state.latestAdjustment.tomorrowAction : '如果不适持续，请暂停训练并咨询医生或专业人士。')
        : currentWeek
          ? currentWeek.focus
          : state.plan.planTrustNote,
      trustBody: isBlocked
        ? '这一步不是在否定你的目标，而是在避免你现在直接被推进不合适的强度训练。'
        : state.plan.planBasisNote,
      trustCaption: isBlocked
        ? (state.screening.notes && state.screening.notes.length ? state.screening.notes[0] : '如果不适持续，请暂停训练并咨询医生或专业人士。')
        : state.plan.planTrustNote,
      matchingTitle: state.profile.displayName ? `${state.profile.displayName} 的计划是这样匹配出来的` : '这份计划是这样匹配出来的',
      matchingFactors: state.plan.matchFactors || []
    });
  },

  openHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

  openPlan() {
    wx.switchTab({
      url: '/pages/plan/index'
    });
  },

  shareToFriend() {
    const payload = buildSharePayload(app.getState(), 'plan');
    const nextState = recordShare(app.getState(), 'friend', 'plan');
    app.setState(() => nextState);

    return {
      title: payload.title,
      path: payload.path,
      desc: payload.desc
    };
  },

  showMiniProgramGuide() {
    const nextState = markGuideShown(app.getState(), 'mini_program', 'after_setup');
    app.setState(() => nextState);

    wx.showModal({
      title: '添加到我的小程序',
      content: getMiniProgramGuideSteps().join('\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onShareAppMessage() {
    return this.shareToFriend();
  },

  onShareTimeline() {
    const payload = buildSharePayload(app.getState(), 'plan');
    const nextState = recordShare(app.getState(), 'timeline', 'plan');
    app.setState(() => nextState);

    return {
      title: payload.title,
      query: payload.query
    };
  }
});
