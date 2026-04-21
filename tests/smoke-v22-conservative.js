const assert = require('assert');

const {
  buildNextStateAfterCheckin,
  buildRiskSnapshot,
  buildWeeklyReview,
  createSetupBundle
} = require('../utils/training-engine');

function runSmokeTest() {
  let state = createSetupBundle(
    {
      raceDate: '2026-06-28',
      raceName: '测试半马',
      longestRunKm: 7,
      recentWeeklyRuns: 2,
      recentWeeklyMileage: 15,
      hasRun10k: false,
      trainingDaysPerWeek: 3,
      goalType: 'steady'
    },
    {
      doctorStop: false,
      cardioRisk: false,
      pain: false,
      noRegularExercise: false,
      acuteInjury: false
    },
    '2026-04-11'
  );

  const weekOneTrackableDates = state.plan.weeks[0].days.filter((task) => task.trackable).map((task) => task.dateKey);

  state = buildNextStateAfterCheckin(
    state,
    { completion: 'partial', feeling: 'tired', issue: 'none' },
    weekOneTrackableDates[0]
  ).nextState;

  state = buildNextStateAfterCheckin(
    state,
    { completion: 'partial', feeling: 'very_tired', issue: 'no_time' },
    weekOneTrackableDates[1]
  ).nextState;

  state = buildNextStateAfterCheckin(
    state,
    { completion: 'missed', feeling: 'normal', issue: 'no_time' },
    weekOneTrackableDates[2]
  ).nextState;

  const snapshot = buildRiskSnapshot(state, weekOneTrackableDates[2]);
  const weeklyReview = buildWeeklyReview(state.plan, state.records, weekOneTrackableDates[2], snapshot);

  assert.strictEqual(snapshot.level, 'medium', '连续疲劳 / 没时间后风险应至少提升到中风险');
  assert.strictEqual(snapshot.planStatus, 'warning', '复杂异常场景应先进入 warning');
  assert.ok(snapshot.recentFeedback.tiredCount >= 2, '应识别连续疲劳');
  assert.ok(snapshot.recentFeedback.noTimeCount >= 2, '应识别连续没时间');
  assert.ok(snapshot.recentFeedback.lowCompletion, '部分完成比例偏高时应识别为低完成质量');
  assert.ok(snapshot.messages.some((item) => item.includes('连续几次都很累') || item.includes('偏高') || item.includes('连续几次都没时间')), '应输出保守建议相关提示');
  assert.ok(weeklyReview, '应能生成每周复盘数据');
  assert.ok(weeklyReview.items.length >= 3, '每周复盘应包含核心复盘项');

  console.log('V2.2 conservative smoke test passed.');
  console.log(
    JSON.stringify(
      {
        riskLevel: snapshot.level,
        planStatus: snapshot.planStatus,
        recentFeedback: snapshot.recentFeedback,
        weeklyReview
      },
      null,
      2
    )
  );
}

runSmokeTest();
