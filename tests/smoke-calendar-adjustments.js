const assert = require('assert');

const { moveTask, skipTask } = require('../utils/calendar-engine');
const { createSetupBundle } = require('../utils/training-engine');

function createState() {
  return createSetupBundle(
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
}

function runMoveKeepsAnchorTest() {
  const state = createState();
  const weekOneDays = state.plan.weeks[0].days;
  const easyTask = weekOneDays.find((task) => task.type === 'easy');
  const longTask = weekOneDays.find((task) => task.type === 'long');

  const result = moveTask(state.plan, state.records, easyTask.dateKey, longTask.dateKey);

  assert.strictEqual(result.success, true, '普通训练改到长距离日时应能成功，并保住长距离锚点');
  assert.strictEqual(result.changes.preserved.length, 1, '原本的长距离锚点应被保留');
  assert.strictEqual(result.changes.deleted.length, 0, '不应误删关键训练');
  assert.strictEqual(result.tasksByDate[longTask.dateKey].title, easyTask.title, '目标日期应放入用户主动移动的训练');
  assert.strictEqual(result.tasksByDate[easyTask.dateKey].title, longTask.title, '原本的长距离应被挪回源日期');
}

function runSkipKeyWorkoutTest() {
  const state = createState();
  const weekOneDays = state.plan.weeks[0].days;
  const qualityTask = weekOneDays.find((task) => task.type === 'quality');

  const result = skipTask(state.plan, state.records, qualityTask.dateKey);

  assert.strictEqual(result.success, true, '关键训练跳过后应能成功触发重排');
  assert.strictEqual(result.changes.skipped.length, 1, '原训练应被记录为跳过');
  assert.ok(result.changes.rescheduled.length >= 1, '关键训练应在未来 7 天内自动顺延');
  assert.strictEqual(result.tasksByDate[qualityTask.dateKey].type, 'rest', '原日期应被改成休息');

  const rescheduled = result.changes.rescheduled[0];
  assert.strictEqual(result.tasksByDate[rescheduled.to].title, qualityTask.title, '顺延后的日期应放入原关键训练');
}

function runSmokeTest() {
  runMoveKeepsAnchorTest();
  runSkipKeyWorkoutTest();

  console.log('Calendar adjustment smoke test passed.');
}

runSmokeTest();
