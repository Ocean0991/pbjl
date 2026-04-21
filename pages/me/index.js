const { createSetupBundle, getGoalLabel, getPlanStatusLabel, getRiskLabel } = require('../../utils/training-engine');
const { daysBetween, getTodayKey } = require('../../utils/date');
const {
  buildSharePayload,
  getFavoriteGuideSteps,
  getMiniProgramGuideSteps,
  markGuideShown,
  markSubscriptionIntent,
  prepareShareMenu,
  recordShare
} = require('../../utils/wechat-ecosystem');

const app = getApp();

const LONGEST_RUN_LABELS = {
  2.5: '3 公里以内',
  4: '3 到 5 公里',
  7: '5 到 10 公里',
  10.5: '10 公里以上'
};

const WEEKLY_RUNS_LABELS = {
  0: '几乎没跑',
  1: '每周 1 次',
  2: '每周 2 次',
  3: '每周 3 次及以上'
};

const WEEKLY_MILEAGE_LABELS = {
  8: '不到 10 公里',
  15: '10 到 20 公里',
  25: '20 到 30 公里',
  32: '30 公里以上'
};

const GENDER_LABELS = {
  male: '男',
  female: '女',
  unspecified: '未填写'
};

const SYMPTOM_LABELS = {
  steady: '状态稳定',
  fatigue: '有些疲劳',
  discomfort: '最近不适'
};

const INJURY_LABELS = {
  none: '没有',
  recovering: '恢复中',
  current: '当前受伤'
};

function getLongestRunLabel(value) {
  return LONGEST_RUN_LABELS[value] || (value ? value + ' 公里' : '未填写');
}

function getWeeklyRunsLabel(value) {
  return WEEKLY_RUNS_LABELS[value] || (value ? '每周 ' + value + ' 次' : '未填写');
}

function getWeeklyMileageLabel(value) {
  return WEEKLY_MILEAGE_LABELS[value] || (value ? value + ' 公里' : '未填写');
}

function getGenderLabel(value) {
  return GENDER_LABELS[value] || '未填写';
}

function getSymptomLabel(value) {
  return SYMPTOM_LABELS[value] || '未填写';
}

function getInjuryLabel(value) {
  return INJURY_LABELS[value] || '未填写';
}

Page({
  data: {
    themeClass: 'theme-dark',
    profile: null,
    plan: null,
    planState: null,
    screening: null,
    raceCountdownText: '',
    focusText: '',
    goalLabel: '',
    riskLabel: '',
    planStatusLabel: '',
    hasRebuiltPlanText: '否',
    lastRebuiltAtText: '还没有',
    subscriptionStatusText: '提醒入口未开启',
    longestRunLabel: '',
    weeklyRunsLabel: '',
    weeklyMileageLabel: '',
    displayNameLabel: '',
    genderLabel: '',
    birthYearLabel: '',
    symptomStatusLabel: '',
    injuryStatusLabel: '',
    sleepHoursLabel: '',
    hrvLabel: '',
    heartRateSummaryLabel: '',
    tenKPaceLabel: ''
  },

  onShow() {
    const state = app.getState();
    if (!state.profile) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    const raceCountdown = state.profile ? daysBetween(getTodayKey(), state.profile.raceDate) : 0;

    this.setData({
      themeClass: app.getThemeClass(),
      profile: state.profile,
      plan: state.plan,
      planState: state.planState,
      screening: state.screening,
      raceCountdownText: raceCountdown > 0 ? `距离比赛还有 ${raceCountdown} 天` : '比赛已经进入最后阶段',
      focusText: this.getFocusText(state),
      goalLabel: state.planState ? getGoalLabel(state.planState.currentGoalType) : '',
      riskLabel: state.planState ? getRiskLabel(state.planState.riskLevel) : '',
      planStatusLabel: state.planState ? getPlanStatusLabel(state.planState.planStatus) : '',
      hasRebuiltPlanText: state.planState && state.planState.hasRebuiltPlan ? '是' : '否',
      lastRebuiltAtText: state.planState && state.planState.lastRebuiltAt ? state.planState.lastRebuiltAt.slice(0, 16).replace('T', ' ') : '还没有',
      subscriptionStatusText:
        state.ecosystem && state.ecosystem.subscriptionIntentEnabled ? '提醒入口已保留，等正式模板接入后可直接启用' : '提醒入口还没开，先把入口留好',
      longestRunLabel: getLongestRunLabel(state.profile.longestRunKm),
      weeklyRunsLabel: getWeeklyRunsLabel(state.profile.recentWeeklyRuns),
      weeklyMileageLabel: getWeeklyMileageLabel(state.profile.recentWeeklyMileage),
      displayNameLabel: state.profile.displayName || '未填写',
      genderLabel: getGenderLabel(state.profile.gender),
      birthYearLabel: state.profile.birthYear || '未填写',
      symptomStatusLabel: getSymptomLabel(state.profile.symptomStatus),
      injuryStatusLabel: getInjuryLabel(state.profile.injuryStatus),
      sleepHoursLabel: state.profile.sleepHours ? `${state.profile.sleepHours} 小时` : '未填写',
      hrvLabel: state.profile.hrv > 0 ? `${state.profile.hrv} ms` : '未填写',
      heartRateSummaryLabel:
        state.profile.maxHeartRate || state.profile.restingHeartRate
          ? `最大 ${state.profile.maxHeartRate || '--'} / 静息 ${state.profile.restingHeartRate || '--'}`
          : '未填写',
      tenKPaceLabel: state.profile.tenKPace || '未填写'
    });

    prepareShareMenu();
  },

  getFocusText(state) {
    if (!state || !state.planState) {
      return '这不是复杂的跑步平台，它只是每天给你一个清楚、可信的训练答案。';
    }

    if (state.planState.riskLevel === 'high') {
      return '现在先别追进度，先把风险压下来，比硬顶更重要。';
    }

    if (state.planState.planStatus === 'rebuilt') {
      return '你现在用的是重组后的计划。后面最重要的，是按新的节奏继续，不回头补旧课。';
    }

    if (state.planState.riskLevel === 'medium') {
      return '最近节奏有点乱了。这一周先保长距离和恢复，别急着把每次都做满。';
    }

    return '你现在最需要做的，不是研究更多内容，而是每天回来看看今天该怎么练。';
  },

  regeneratePlan() {
    const state = app.getState();
    if (!state.profile || !state.screening) {
      return;
    }

    const bundle = createSetupBundle(state.profile, state.screening.rawAnswers, getTodayKey(), {
      previousState: state,
      preserveRecords: true,
      currentGoalType: state.planState ? state.planState.currentGoalType : undefined
    });

    app.setState((previousState) => ({
      profile: bundle.profile,
      screening: bundle.screening,
      plan: bundle.plan,
      planState: bundle.planState,
      ecosystem: previousState.ecosystem,
      records: bundle.records,
      latestAdjustment: bundle.latestAdjustment,
      settings: previousState.settings,
      meta: Object.assign({}, previousState.meta, bundle.meta, { updatedAt: new Date().toISOString() })
    }));

    wx.showToast({
      title: '计划已重新生成',
      icon: 'none'
    });

    this.onShow();
  },

  redoSetup() {
    app.globalData.setupDraft = Object.assign({}, this.data.profile);

    wx.navigateTo({
      url: '/pages/profile/index'
    });
  },

  guideTimelineShare() {
    wx.showModal({
      title: '分享到朋友圈',
      content: '小程序的朋友圈分享仍然走微信右上角菜单。\n\n你可以先点右上角“···”，再选择“分享到朋友圈”。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  openReminderGuide() {
    let nextState = markGuideShown(app.getState(), 'subscription', 'me_settings');
    nextState = markSubscriptionIntent(nextState);
    app.setState(() => nextState);

    const tmplIds = [];
    if (tmplIds.length === 0) {
      wx.showModal({
        title: '开启提醒',
        content: '这一版先把提醒入口和本地状态留好。正式的订阅消息模板 ID 还没接进来，所以现在先做授权引导，不会真的发消息。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds,
      success(res) {
        const accepted = tmplIds.some(function(id) {
          return res[id] === 'accept';
        });

        if (accepted) {
          wx.showToast({
            title: '提醒已开启',
            icon: 'none'
          });
        }
      },
      fail() {
        wx.showModal({
          title: '开启提醒',
          content: '授权没有成功，你可以在微信设置里重新开启。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  openMiniProgramGuide() {
    const nextState = markGuideShown(app.getState(), 'mini_program', 'manual');
    app.setState(() => nextState);

    wx.showModal({
      title: '添加到我的小程序',
      content: getMiniProgramGuideSteps().join('\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  },

  openFavoriteGuide() {
    const nextState = markGuideShown(app.getState(), 'favorite', 'race_reminder');
    app.setState(() => nextState);

    wx.showModal({
      title: '收藏推荐页',
      content: getFavoriteGuideSteps('今日训练').concat(['赛前提醒页现在还没单独做出来，这个收藏入口先预留。']).join('\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  },

  openFeedbackPage() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  },

  openWeeklyReview() {
    wx.navigateTo({
      url: '/pages/weekly-review/index'
    });
  },

  openPrediction() {
    wx.navigateTo({
      url: '/pages/prediction/index'
    });
  },

  openCoach() {
    wx.navigateTo({
      url: '/pages/coach/index'
    });
  },

  openPlanHistory() {
    wx.navigateTo({
      url: '/pages/plan-history/index'
    });
  },

  openLoadDetail() {
    wx.navigateTo({
      url: '/pages/load-detail/index'
    });
  },

  openGoalSetting() {
    wx.navigateTo({
      url: '/pages/goal-setting/index'
    });
  },

  openAboutAuthorPage() {
    wx.navigateTo({
      url: '/pages/about-author/index'
    });
  },

  onShareAppMessage(event) {
    const sourcePage =
      event && event.from === 'button' && event.target && event.target.dataset && event.target.dataset.shareSource
        ? event.target.dataset.shareSource
        : 'me';
    const payload = buildSharePayload(app.getState(), 'me');
    const nextState = recordShare(app.getState(), 'friend', sourcePage);
    app.setState(() => nextState);

    return {
      title: payload.title,
      path: payload.path,
      desc: payload.desc
    };
  },

  onShareTimeline() {
    const payload = buildSharePayload(app.getState(), 'me');
    const nextState = recordShare(app.getState(), 'timeline', 'me');
    app.setState(() => nextState);

    return {
      title: payload.title,
      query: payload.query || ''
    };
  }
});
