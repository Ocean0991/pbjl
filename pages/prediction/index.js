const App = getApp();
const { formatDate } = require('../../utils/util');
const { buildPredictionSnapshot, formatTimeFromSeconds, formatPaceFromSeconds, RACE_DISTANCES } = require('../../utils/prediction-engine');
const { buildRiskSnapshot } = require('../../utils/training-engine');
const { calculateTrainingLoad, interpretTSB } = require('../../utils/load-engine-v2');

Page({
  data: {
    prediction: null,
    raceTypeLabel: '',
    predictedTime: '--:--',
    predictedPace: '--:--',
    targetTime: '--:--',
    targetPace: '--:--',
    confidenceScore: 0,
    confidenceLabel: '',
    confidenceLevel: 'low',
    varianceRange: '',
    adviceText: '',
    readinessScore: 0,
    readinessLabel: '',
    tsbStatus: null,
    raceDistance: 0,
    daysToRace: 0,
    showCalibrateModal: false,
    calibrateMinutes: ''
  },

  onLoad() {
    this.loadPredictionData();
  },

  onShow() {
    this.loadPredictionData();
  },

  loadPredictionData() {
    const state = App.getState();
    if (!state.profile || !state.plan) {
      this.setData({
        adviceText: '完成建档后才能生成成绩预测。'
      });
      return;
    }

    const today = formatDate(new Date());
    const prediction = buildPredictionSnapshot(state, today);
    const riskSnapshot = buildRiskSnapshot(state, today);
    const loadData = calculateTrainingLoad(state.records, today);
    const tsbStatus = interpretTSB(loadData.tsb);

    const raceTypeLabels = {
      '5k': '5公里', '10k': '10公里',
      'half': '半程马拉松', 'full': '全程马拉松'
    };

    const raceDistance = RACE_DISTANCES[prediction.raceType] || 21.0975;
    const daysToRace = state.profile.raceDate
      ? Math.max(0, Math.ceil((new Date(state.profile.raceDate) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    const predictedTime = formatTimeFromSeconds(prediction.predictedTimeSeconds);
    const predictedPace = formatPaceFromSeconds(prediction.predictedTimeSeconds, raceDistance);
    const targetTime = formatTimeFromSeconds(prediction.targetTimeSeconds);
    const targetPace = formatPaceFromSeconds(prediction.targetTimeSeconds, raceDistance);

    const varianceMin = formatTimeFromSeconds(Math.max(0, prediction.predictedTimeSeconds - prediction.varianceSeconds));
    const varianceMax = formatTimeFromSeconds(prediction.predictedTimeSeconds + prediction.varianceSeconds);

    let confidenceLabel = '低';
    if (prediction.confidenceScore >= 70) confidenceLabel = '高';
    else if (prediction.confidenceScore >= 40) confidenceLabel = '中';

    let confidenceLevel = 'low';
    if (prediction.confidenceScore >= 70) confidenceLevel = 'high';
    else if (prediction.confidenceScore >= 40) confidenceLevel = 'medium';

    let readinessScore = 50;
    if (loadData.tsb > 5) readinessScore = 80;
    else if (loadData.tsb > -10) readinessScore = 60;
    else if (loadData.tsb > -30) readinessScore = 35;
    else readinessScore = 15;

    if (riskSnapshot && riskSnapshot.level === 'high') readinessScore = Math.min(readinessScore, 25);

    let readinessLabel = '需要更多准备';
    if (readinessScore >= 70) readinessLabel = '准备充分';
    else if (readinessScore >= 50) readinessLabel = '基本就绪';

    this.setData({
      prediction,
      raceTypeLabel: raceTypeLabels[prediction.raceType] || '半程马拉松',
      predictedTime,
      predictedPace,
      targetTime,
      targetPace,
      confidenceScore: prediction.confidenceScore,
      confidenceLabel,
      confidenceLevel,
      varianceRange: `${varianceMin} - ${varianceMax}`,
      adviceText: prediction.adviceText,
      readinessScore,
      readinessLabel,
      tsbStatus,
      raceDistance,
      daysToRace
    });
  },

  onCalibrate() {
    this.setData({ showCalibrateModal: true });
  },

  onCloseCalibrate() {
    this.setData({ showCalibrateModal: false, calibrateMinutes: '' });
  },

  onCalibrateInput(e) {
    this.setData({ calibrateMinutes: e.detail.value });
  },

  onConfirmCalibrate() {
    const minutes = parseInt(this.data.calibrateMinutes);
    if (!minutes || minutes <= 0) {
      wx.showToast({ title: '请输入有效时间', icon: 'none' });
      return;
    }

    const state = App.getState();
    state.profile = state.profile || {};
    state.profile.goalTimeSeconds = minutes * 60;
    App.setState(() => state);

    this.setData({ showCalibrateModal: false, calibrateMinutes: '' });
    this.loadPredictionData();

    wx.showToast({ title: '已更新目标时间', icon: 'success' });
  },

  onBack() {
    wx.navigateBack();
  }
});
