var { getTodayKey, addDays, getDayKey, daysBetween } = require('./date');

function calculateSrpeLoad(durationMin, rpe) {
  if (!durationMin || !rpe || rpe <= 0) return 0;
  return Math.round(durationMin * rpe);
}

function estimateDurationMin(task) {
  if (!task) return 0;
  if (task.type === 'rest') return 0;
  if (task.type === 'mobility') return 20;
  if (task.type === 'recovery') return 30;
  if (task.type === 'easy') return 40;
  if (task.type === 'long') return 75;
  if (task.type === 'quality') return 50;
  if (task.type === 'strength') return 35;
  if (task.type === 'cross') return 40;
  if (task.type === 'race') return 120;
  return 40;
}

function estimateRpe(task, record) {
  if (record && record.rpe && record.rpe > 0) return record.rpe;
  if (!task) return 0;
  if (task.type === 'rest') return 0;
  if (task.type === 'recovery') return 3;
  if (task.type === 'easy') return 4;
  if (task.type === 'long') return 5;
  if (task.type === 'quality') return 7;
  if (task.type === 'strength') return 5;
  if (task.type === 'mobility') return 2;
  if (task.type === 'cross') return 3;
  if (task.type === 'race') return 8;
  return 4;
}

function buildLoadSnapshot(state, dateKey) {
  var todayKey = dateKey || getTodayKey();
  var records = state.records || {};
  var plan = state.plan;
  var tasksByDate = plan && plan.tasksByDate ? plan.tasksByDate : {};

  var srpeLoad7d = 0;
  var dailyLoads = [];
  for (var i = 0; i < 7; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var record = records[pastKey];
    var task = tasksByDate[pastKey];
    if (!task || task.type === 'rest') continue;

    var duration = estimateDurationMin(task);
    var rpe = estimateRpe(task, record);
    var load = calculateSrpeLoad(duration, rpe);

    if (record && record.completion === 'partial') {
      load = Math.round(load * 0.6);
    }
    if (record && record.completion === 'missed') {
      load = 0;
    }

    srpeLoad7d += load;
    dailyLoads.push({
      dateKey: pastKey,
      load: load,
      duration: duration,
      rpe: rpe,
      type: task.type
    });
  }

  var consistency14d = calculateConsistency(records, tasksByDate, todayKey, 14);
  var keyWorkoutCompletion14d = calculateKeyWorkoutCompletion(records, tasksByDate, todayKey, 14);

  var fatigueScore = calculateFatigueScore(srpeLoad7d, records, todayKey);
  var fitnessScore = calculateFitnessScore(consistency14d, keyWorkoutCompletion14d, records, tasksByDate, todayKey);
  var formScore = fitnessScore - fatigueScore;
  var stateLabel = determineStateLabel(formScore, fatigueScore);

  return {
    dateKey: todayKey,
    srpeLoad7d: srpeLoad7d,
    consistency14d: consistency14d,
    keyWorkoutCompletion14d: keyWorkoutCompletion14d,
    fatigueScore: fatigueScore,
    fitnessScore: fitnessScore,
    formScore: formScore,
    stateLabel: stateLabel,
    dailyLoads: dailyLoads.reverse()
  };
}

function calculateConsistency(records, tasksByDate, todayKey, days) {
  var planned = 0;
  var completed = 0;

  for (var i = 0; i < days; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var task = tasksByDate[pastKey];
    if (!task || task.type === 'rest') continue;
    planned++;
    var record = records[pastKey];
    if (record && (record.completion === 'full' || record.completion === 'partial')) {
      completed++;
    }
  }

  return planned > 0 ? Math.round((completed / planned) * 100) : 0;
}

function calculateKeyWorkoutCompletion(records, tasksByDate, todayKey, days) {
  var keyPlanned = 0;
  var keyCompleted = 0;

  for (var i = 0; i < days; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var task = tasksByDate[pastKey];
    if (!task) continue;
    if (task.type !== 'long' && task.type !== 'quality') continue;
    keyPlanned++;
    var record = records[pastKey];
    if (record && record.completion === 'full') {
      keyCompleted++;
    }
  }

  return keyPlanned > 0 ? Math.round((keyCompleted / keyPlanned) * 100) : 0;
}

function calculateFatigueScore(srpeLoad7d, records, todayKey) {
  var baseScore = Math.min(100, Math.round(srpeLoad7d / 20));

  var discomfortCount = 0;
  var veryTiredCount = 0;
  for (var i = 0; i < 3; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var record = records[pastKey];
    if (record) {
      if (record.feeling === 'discomfort') discomfortCount++;
      if (record.feeling === 'very_tired') veryTiredCount++;
    }
  }

  var adjustment = discomfortCount * 12 + veryTiredCount * 6;
  return Math.min(100, baseScore + adjustment);
}

function calculateFitnessScore(consistency14d, keyWorkoutCompletion14d, records, tasksByDate, todayKey) {
  var consistencyWeight = 0.4;
  var keyWeight = 0.35;
  var stabilityWeight = 0.25;

  var stability = calculateStability(records, tasksByDate, todayKey);

  return Math.round(
    consistency14d * consistencyWeight +
    keyWorkoutCompletion14d * keyWeight +
    stability * stabilityWeight
  );
}

function calculateStability(records, tasksByDate, todayKey) {
  var completions = [];
  for (var i = 0; i < 14; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var task = tasksByDate[pastKey];
    if (!task || task.type === 'rest') continue;
    var record = records[pastKey];
    if (record && record.completion === 'full') {
      completions.push(1);
    } else if (record && record.completion === 'partial') {
      completions.push(0.5);
    } else {
      completions.push(0);
    }
  }

  if (completions.length < 3) return 50;

  var streak = 0;
  var maxStreak = 0;
  for (var j = 0; j < completions.length; j++) {
    if (completions[j] >= 0.5) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }
  }

  return Math.min(100, Math.round((maxStreak / completions.length) * 150));
}

function determineStateLabel(formScore, fatigueScore) {
  if (fatigueScore > 75) return 'recover';
  if (formScore > 15) return 'push';
  if (formScore < -10) return 'recover';
  return 'hold';
}

function buildLoadTrend(state, dateKey, days) {
  var trendDays = days || 28;
  var todayKey = dateKey || getTodayKey();
  var records = state.records || {};
  var plan = state.plan;
  var tasksByDate = plan && plan.tasksByDate ? plan.tasksByDate : {};
  var trend = [];

  for (var i = trendDays - 1; i >= 0; i--) {
    var pastKey = getDayKey(addDays(todayKey, -i));
    var record = records[pastKey];
    var task = tasksByDate[pastKey];

    if (!task || task.type === 'rest') {
      trend.push({
        dateKey: pastKey,
        load: 0,
        type: 'rest'
      });
      continue;
    }

    var duration = estimateDurationMin(task);
    var rpe = estimateRpe(task, record);
    var load = calculateSrpeLoad(duration, rpe);

    if (record && record.completion === 'partial') {
      load = Math.round(load * 0.6);
    }
    if (record && record.completion === 'missed') {
      load = 0;
    }

    trend.push({
      dateKey: pastKey,
      load: load,
      type: task.type,
      completed: record ? record.completion : 'planned'
    });
  }

  return trend;
}

function buildLoadSummaryText(snapshot) {
  if (!snapshot) return '暂无负荷数据';

  var stateTexts = {
    push: '当前状态适合推进，可以按计划执行。',
    hold: '当前状态适中，保持现有节奏就好。',
    recover: '当前疲劳偏高，建议适当减量或增加恢复。'
  };

  var parts = [];
  parts.push('7 天训练负荷：' + snapshot.srpeLoad7d);
  parts.push('14 天连续性：' + snapshot.consistency14d + '%');
  parts.push('关键训练完成率：' + snapshot.keyWorkoutCompletion14d + '%');
  parts.push(stateTexts[snapshot.stateLabel] || '');

  return parts.join('\n');
}

module.exports = {
  buildLoadSnapshot,
  buildLoadSummaryText,
  buildLoadTrend,
  calculateSrpeLoad,
  determineStateLabel,
  estimateDurationMin,
  estimateRpe
};
