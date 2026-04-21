const assert = require('assert');

const { createSetupBundle } = require('../utils/training-engine');

function runSmokeTest() {
  const state = createSetupBundle(
    {
      raceDate: '2026-06-28',
      raceName: '测试半马',
      longestRunKm: 6,
      recentWeeklyRuns: 2,
      recentWeeklyMileage: 14,
      hasRun10k: false,
      trainingDaysPerWeek: 4,
      goalType: 'steady',
      symptomStatus: 'fatigue',
      injuryStatus: 'recovering',
      sleepHours: 6.2,
      maxHeartRate: 188,
      restingHeartRate: 58,
      vo2Max: 41
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

  const weekTypes = state.plan.weeks[0].days.map((task) => task.type);
  const crossTask = state.plan.weeks[0].days.find((task) => task.type === 'cross');
  const strengthTask = state.plan.weeks[0].days.find((task) => task.type === 'strength');

  assert.strictEqual(state.screening.riskLevel, 'medium', '伤病恢复期和睡眠不足时应至少提升到中风险');
  assert.strictEqual(state.plan.mode, 'conservative', '健康档案提示恢复压力较大时应转入保守计划');
  assert.ok(weekTypes.includes('cross'), '恢复压力较大时应加入交叉训练');
  assert.ok(weekTypes.includes('mobility'), '恢复压力较大时应加入灵活性恢复');
  assert.ok(strengthTask, '计划中应包含力量稳定训练');
  assert.ok(crossTask && crossTask.reasonNote && crossTask.reasonNote.includes('心率参考'), '交叉训练应带出心率参考');
  assert.ok(
    state.plan.matchFactors.some((item) => item.includes('睡眠') || item.includes('最大心率') || item.includes('交叉训练')),
    '匹配说明里应体现健康信息对计划的影响'
  );

  console.log('Health adaptive smoke test passed.');
  console.log(
    JSON.stringify(
      {
        riskLevel: state.screening.riskLevel,
        mode: state.plan.mode,
        trainingMixLabels: state.plan.trainingMixLabels,
        firstWeekTypes: weekTypes,
        crossTask,
        matchFactors: state.plan.matchFactors
      },
      null,
      2
    )
  );
}

runSmokeTest();
