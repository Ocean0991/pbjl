const assert = require('assert');

const {
  buildNextStateAfterCheckin,
  buildNextStateAfterRebuildPlan,
  buildRiskSnapshot,
  createSetupBundle
} = require('../utils/training-engine');

function runSmokeTest() {
  let state = createSetupBundle(
    {
      raceDate: '2026-06-28',
      raceName: '测试半马',
      longestRunKm: 8,
      recentWeeklyRuns: 3,
      recentWeeklyMileage: 18,
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

  const firstLongRunDate = state.plan.weeks[0].days.find((task) => task.type === 'long').dateKey;
  const secondLongRunDate = state.plan.weeks[1].days.find((task) => task.type === 'long').dateKey;

  state = buildNextStateAfterCheckin(
    state,
    {
      completion: 'missed',
      feeling: 'normal',
      issue: 'none'
    },
    firstLongRunDate
  ).nextState;

  assert.strictEqual(state.planState.planStatus, 'warning', '第一次漏掉长距离后应进入 warning');
  assert.strictEqual(state.planState.longRunMissedStreak, 1, '第一次漏掉长距离后 streak 应为 1');

  const beforeDowngradeTargets = state.plan.weeks.slice(1, 4).map((week) => week.longRunTarget);

  state = buildNextStateAfterCheckin(
    state,
    {
      completion: 'missed',
      feeling: 'normal',
      issue: 'none'
    },
    secondLongRunDate
  ).nextState;

  const downgradedRisk = buildRiskSnapshot(state, secondLongRunDate);

  assert.strictEqual(state.planState.planStatus, 'downgraded', '连续两周漏掉长距离后应进入 downgraded');
  assert.strictEqual(state.planState.longRunMissedStreak, 2, '连续两周漏掉长距离后 streak 应为 2');
  assert.ok(downgradedRisk.showPlanRiskCard, '连续两周漏掉长距离后首页应出现风险卡');
  assert.ok(
    ['conservative_finish', 'run_walk_finish'].includes(state.planState.recommendedGoalType),
    '连续两周漏掉长距离后应给出更保守目标'
  );

  const rebuilt = buildNextStateAfterRebuildPlan(state, secondLongRunDate, {
    goalType: state.planState.recommendedGoalType
  });

  state = rebuilt.nextState;

  const afterRebuildTargets = state.plan.weeks.slice(0, 3).map((week) => week.longRunTarget);

  assert.strictEqual(state.planState.planStatus, 'rebuilt', '接受建议重组后应进入 rebuilt');
  assert.strictEqual(state.planState.planVersion, 2, '重组后计划版本号应递增');
  assert.strictEqual(state.planState.hasRebuiltPlan, true, '重组后应记录 hasRebuiltPlan');
  assert.strictEqual(state.planState.rebuildHistory.length, 1, '重组后应写入 rebuildHistory');
  assert.notDeepStrictEqual(afterRebuildTargets, beforeDowngradeTargets, '重组后后续周长距离安排应发生变化');

  console.log('Smoke test passed.');
  console.log(
    JSON.stringify(
      {
        warningStatus: 'warning',
        downgradedStatus: downgradedRisk.planStatus,
        rebuiltStatus: state.planState.planStatus,
        recommendedGoalTypeBeforeRebuild: rebuilt.historyItem.toGoalType,
        longRunTargetsBeforeRebuild: beforeDowngradeTargets,
        longRunTargetsAfterRebuild: afterRebuildTargets
      },
      null,
      2
    )
  );
}

runSmokeTest();
