var { getTodayKey, addDays, getDayKey, daysBetween } = require('./date');
var { estimateDurationMin, estimateRpe } = require('./load-engine');

var RACE_DISTANCES = {
  '5k': 5,
  '10k': 10,
  'half': 21.0975,
  'full': 42.195
};

var BEGINNER_BASE_TIMES = {
  '5k': { steady: 2100, improve: 1800, run_walk: 2400 },
  '10k': { steady: 4200, improve: 3600, run_walk: 4800 },
  'half': { steady: 9000, improve: 7800, run_walk: 10800 },
  'full': { steady: 19800, improve: 18000, run_walk: 23400 }
};

function buildPredictionSnapshot(state, dateKey) {
  var todayKey = dateKey || getTodayKey();
  var profile = state.profile;
  var plan = state.plan;
  var records = state.records || {};
  var planState = state.planState || {};

  if (!profile || !plan) {
    return buildEmptyPrediction(todayKey);
  }

  var raceType = profile.raceType || 'half';
  var goalMode = planState.currentGoalType || profile.goalType || 'steady';
  var goalTimeSeconds = profile.goalTimeSeconds || BEGINNER_BASE_TIMES[raceType][goalMode] || BEGINNER_BASE_TIMES[raceType].steady;

  var predictedTimeSeconds = calculatePredictedTime(state, todayKey, raceType, goalMode);
  var confidenceScore = calculateConfidence(state, todayKey);
  var varianceSeconds = calculateVariance(predictedTimeSeconds, confidenceScore);
  var adviceText = buildAdviceText(predictedTimeSeconds, goalTimeSeconds, confidenceScore, raceType);

  return {
    dateKey: todayKey,
    targetTimeSeconds: goalTimeSeconds,
    predictedTimeSeconds: predictedTimeSeconds,
    confidenceScore: confidenceScore,
    varianceSeconds: varianceSeconds,
    adviceText: adviceText,
    raceType: raceType,
    goalMode: goalMode
  };
}

function calculatePredictedTime(state, todayKey, raceType, goalMode) {
  var profile = state.profile;
  var records = state.records || {};
  var plan = state.plan;
  var tasksByDate = plan && plan.tasksByDate ? plan.tasksByDate : {};

  var baseTime = BEGINNER_BASE_TIMES[raceType] ? BEGINNER_BASE_TIMES[raceType][goalMode] : BEGINNER_BASE_TIMES.half.steady;

  if (profile.goalTimeSeconds) {
    baseTime = profile.goalTimeSeconds;
  }

  var adjustments = 0;
  var recentFeedback = [];

  for (var i = 0; i < 14; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var record = records[pastKey];
    if (record) {
      recentFeedback.push(record);
    }
  }

  var easyCount = 0;
  var hardCount = 0;
  var missedCount = 0;
  var longRunDone = false;

  for (var j = 0; j < recentFeedback.length; j++) {
    var fb = recentFeedback[j];
    if (fb.completion === 'full' && fb.feeling === 'easy') easyCount++;
    if (fb.completion === 'full' && (fb.feeling === 'very_tired' || fb.feeling === 'discomfort')) hardCount++;
    if (fb.completion === 'missed') missedCount++;
  }

  for (var k = 0; k < 7; k++) {
    var pastKey2 = getDayKey(addDays(todayKey, -(k + 1)));
    var task = tasksByDate[pastKey2];
    var record2 = records[pastKey2];
    if (task && task.type === 'long' && record2 && record2.completion === 'full') {
      longRunDone = true;
      break;
    }
  }

  if (easyCount >= 3) {
    adjustments -= Math.round(baseTime * 0.02);
  }
  if (easyCount >= 5) {
    adjustments -= Math.round(baseTime * 0.03);
  }
  if (hardCount >= 2) {
    adjustments += Math.round(baseTime * 0.05);
  }
  if (hardCount >= 4) {
    adjustments += Math.round(baseTime * 0.08);
  }
  if (missedCount >= 3) {
    adjustments += Math.round(baseTime * 0.04);
  }
  if (!longRunDone) {
    adjustments += Math.round(baseTime * 0.03);
  }

  if (profile.longestRunKm) {
    var raceDistance = RACE_DISTANCES[raceType] || 21.0975;
    if (profile.longestRunKm >= raceDistance * 0.8) {
      adjustments -= Math.round(baseTime * 0.02);
    } else if (profile.longestRunKm < raceDistance * 0.4) {
      adjustments += Math.round(baseTime * 0.06);
    }
  }

  var predictedTime = baseTime + adjustments;

  var minTime = Math.round(baseTime * 0.7);
  var maxTime = Math.round(baseTime * 1.3);
  predictedTime = Math.max(minTime, Math.min(maxTime, predictedTime));

  return predictedTime;
}

function calculateConfidence(state, todayKey) {
  var records = state.records || {};
  var plan = state.plan;
  var tasksByDate = plan && plan.tasksByDate ? plan.tasksByDate : {};

  var completedCount = 0;
  var plannedCount = 0;
  var keyCompleted = 0;
  var keyPlanned = 0;

  for (var i = 0; i < 14; i++) {
    var pastKey = getDayKey(addDays(todayKey, -(i + 1)));
    var task = tasksByDate[pastKey];
    if (!task || task.type === 'rest') continue;
    plannedCount++;
    var record = records[pastKey];
    if (record && (record.completion === 'full' || record.completion === 'partial')) {
      completedCount++;
    }
    if (task.type === 'long' || task.type === 'quality') {
      keyPlanned++;
      if (record && record.completion === 'full') {
        keyCompleted++;
      }
    }
  }

  if (plannedCount < 3) return 20;

  var completionRate = completedCount / plannedCount;
  var keyRate = keyPlanned > 0 ? keyCompleted / keyPlanned : 0;

  var confidence = Math.round((completionRate * 0.5 + keyRate * 0.5) * 100);
  return Math.max(10, Math.min(95, confidence));
}

function calculateVariance(predictedTime, confidence) {
  var baseVariancePercent = 1 - (confidence / 100);
  var variance = Math.round(predictedTime * baseVariancePercent * 0.5);
  return Math.max(60, variance);
}

function buildAdviceText(predictedTime, goalTime, confidence, raceType) {
  var diff = predictedTime - goalTime;
  var diffPercent = Math.abs(diff) / goalTime;

  if (diff <= 0 && confidence >= 60) {
    return '按你目前的训练状态，完成目标成绩是有希望的。继续保持当前节奏。';
  }

  if (diff <= 0 && confidence < 60) {
    return '预测成绩虽然达标，但训练数据还不够多，继续保持才能稳住。';
  }

  if (diffPercent <= 0.05) {
    return '离目标成绩很近了，接下来每次关键训练都很重要。';
  }

  if (diffPercent <= 0.1) {
    return '离目标还有一点距离，稳住训练节奏比加量更重要。';
  }

  if (diffPercent <= 0.2) {
    return '离目标差距较大，建议把重心放在完赛而不是冲成绩。';
  }

  return '当前预测与目标差距明显，建议调整目标为稳稳完赛。';
}

function formatTimeFromSeconds(seconds) {
  if (!seconds || seconds <= 0) return '--:--';
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  var secs = seconds % 60;

  if (hours > 0) {
    return hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }
  return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}

function formatPaceFromSeconds(seconds, distanceKm) {
  if (!seconds || !distanceKm || distanceKm <= 0) return '--:--';
  var paceSeconds = Math.round(seconds / distanceKm);
  var paceMin = Math.floor(paceSeconds / 60);
  var paceSec = paceSeconds % 60;
  return paceMin + '\'' + (paceSec < 10 ? '0' : '') + paceSec + '"';
}

function buildEmptyPrediction(todayKey) {
  return {
    dateKey: todayKey || getTodayKey(),
    targetTimeSeconds: 0,
    predictedTimeSeconds: 0,
    confidenceScore: 0,
    varianceSeconds: 0,
    adviceText: '建档后才能生成成绩预测。',
    raceType: 'half',
    goalMode: 'steady'
  };
}

module.exports = {
  BEGINNER_BASE_TIMES,
  RACE_DISTANCES,
  buildEmptyPrediction,
  buildPredictionSnapshot,
  calculateConfidence,
  calculatePredictedTime,
  formatPaceFromSeconds,
  formatTimeFromSeconds
};
