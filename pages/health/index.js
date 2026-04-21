const { createSetupBundle } = require('../../utils/training-engine');
const { getTodayKey } = require('../../utils/date');

const app = getApp();

const QUESTIONS = [
  {
    key: 'doctorStop',
    title: '医生是否明确告诉过你，不适合做长距离跑步或中高强度运动'
  },
  {
    key: 'cardioRisk',
    title: '你现在是否有未控制的心血管风险、严重高血压，或近期胸闷胸痛'
  },
  {
    key: 'pain',
    title: '最近是否持续有膝盖、踝关节、足底等明显疼痛'
  },
  {
    key: 'noRegularExercise',
    title: '最近 3 个月是否长期几乎没有规律运动'
  },
  {
    key: 'acuteInjury',
    title: '你是否正处于急性受伤或明显不适恢复期'
  }
];

const HEALTH_FIELD_RULES = {
  heightCm: { label: '身高', min: 120, max: 230 },
  weightKg: { label: '体重', min: 35, max: 200 },
  maxHeartRate: { label: '最大心率', min: 120, max: 230 },
  restingHeartRate: { label: '静息心率', min: 35, max: 120 },
  lactateThresholdHr: { label: '乳酸阈心率', min: 80, max: 210 },
  vo2Max: { label: '最大摄氧量', min: 20, max: 90 },
  hrv: { label: 'HRV', min: 10, max: 200 },
  sleepHours: { label: '睡眠时长', min: 3, max: 14 }
};

function createHealthForm(source) {
  const draft = source || {};
  return {
    symptomStatus: draft.symptomStatus || 'steady',
    injuryStatus: draft.injuryStatus || 'none',
    heightCm: draft.heightCm || '',
    weightKg: draft.weightKg || '',
    maxHeartRate: draft.maxHeartRate || '',
    restingHeartRate: draft.restingHeartRate || '',
    lactateThresholdHr: draft.lactateThresholdHr || '',
    vo2Max: draft.vo2Max || '',
    hrv: draft.hrv || '',
    sleepHours: draft.sleepHours || ''
  };
}

Page({
  data: {
    themeClass: 'theme-dark',
    questions: QUESTIONS,
    answers: {
      doctorStop: null,
      cardioRisk: null,
      pain: null,
      noRegularExercise: null,
      acuteInjury: null
    },
    profileSummary: null,
    healthForm: createHealthForm()
  },

  onShow() {
    const draft = app.globalData.setupDraft || app.getState().profile;

    if (!draft) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    this.setData({
      themeClass: app.getThemeClass(),
      profileSummary: draft,
      healthForm: createHealthForm(draft)
    });
  },

  updateHealthChoice(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.currentTarget.dataset.value;

    this.setData({
      [`healthForm.${key}`]: value
    });
  },

  updateHealthInput(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.detail.value;

    this.setData({
      [`healthForm.${key}`]: value
    });
  },

  chooseAnswer(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.currentTarget.dataset.value === 'true';

    this.setData({
      [`answers.${key}`]: value
    });
  },

  validateHealthForm() {
    const keys = Object.keys(HEALTH_FIELD_RULES);

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const rule = HEALTH_FIELD_RULES[key];
      const rawValue = this.data.healthForm[key];

      if (rawValue === '' || rawValue === null || typeof rawValue === 'undefined') {
        continue;
      }

      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
        wx.showToast({
          title: `${rule.label}先填个合理范围`,
          icon: 'none'
        });
        return false;
      }
    }

    return true;
  },

  submit() {
    const unanswered = this.data.questions.some((item) => this.data.answers[item.key] === null);
    if (unanswered) {
      wx.showToast({
        title: '先把筛查题答完',
        icon: 'none'
      });
      return;
    }

    if (!this.validateHealthForm()) {
      return;
    }

    const mergedDraft = Object.assign({}, app.globalData.setupDraft || this.data.profileSummary || {}, this.data.healthForm);
    app.globalData.setupDraft = mergedDraft;

    const bundle = createSetupBundle(mergedDraft, this.data.answers, getTodayKey());

    app.setState((previousState) => ({
      profile: bundle.profile,
      screening: bundle.screening,
      plan: bundle.plan,
      planState: bundle.planState,
      ecosystem: previousState.ecosystem,
      records: bundle.records,
      latestAdjustment: bundle.latestAdjustment,
      settings: previousState.settings,
      meta: Object.assign({}, previousState.meta, bundle.meta)
    }));

    wx.redirectTo({
      url: '/pages/setup-result/index'
    });
  },

  goBack() {
    wx.navigateBack({
      delta: 1
    });
  }
});
