const { createDefaultPlanState } = require('./store');
const { addDays, clamp, daysBetween, formatDateLabel, getDayKey, getTodayKey, toDate } = require('./date');
const trainingPhases = require('./training-phases');

const RISK_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
};

const LEGACY_GOAL_LABELS = {
  steady: '稳完赛',
  easy: '轻松完赛',
  runwalk: '跑走结合完赛'
};

const GOAL_TYPE_LABELS = {
  standard_finish: '稳完赛',
  conservative_finish: '更保守完赛',
  run_walk_finish: '跑走结合完赛'
};

const PLAN_STATUS_LABELS = {
  normal: '正常推进',
  warning: '需要留意',
  downgraded: '建议调整',
  rebuilt: '已重组'
};

const QUICK_STATUS_LABELS = {
  good: '状态不错',
  tired: '有点累',
  no_time: '没时间',
  discomfort: '身体不舒服',
  missed: '今天没跑成'
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function uniqueMessages(list) {
  return list.filter((item, index) => item && list.indexOf(item) === index);
}

function inferGoalTypeFromPlan(plan) {
  if (!plan) {
    return 'standard_finish';
  }

  if (plan.currentGoalType) {
    return plan.currentGoalType;
  }

  if (plan.currentGoal === 'runwalk') {
    return 'run_walk_finish';
  }

  if (plan.mode === 'conservative') {
    return 'conservative_finish';
  }

  return 'standard_finish';
}

function getInternalGoalFromType(goalType) {
  if (goalType === 'run_walk_finish') {
    return 'runwalk';
  }

  return 'steady';
}

function getGoalLabel(goal) {
  return GOAL_TYPE_LABELS[goal] || LEGACY_GOAL_LABELS[goal] || GOAL_TYPE_LABELS.standard_finish;
}

function getPlanStatusLabel(status) {
  return PLAN_STATUS_LABELS[status] || PLAN_STATUS_LABELS.normal;
}

function getRiskLabel(level) {
  return RISK_LABELS[level] || RISK_LABELS.low;
}

function escalateRisk(current, next) {
  const order = ['low', 'medium', 'high'];
  return order[Math.max(order.indexOf(current || 'low'), order.indexOf(next || 'low'))];
}

function normalizeProfile(profile) {
  const source = profile || {};
  return {
    displayName: (source.displayName || '').trim(),
    gender: source.gender || '',
    birthYear: Number.isFinite(Number(source.birthYear)) ? Number(source.birthYear) : 0,
    raceDate: source.raceDate,
    raceName: (source.raceName || '').trim(),
    longestRunKm: toNumber(source.longestRunKm),
    recentWeeklyRuns: toNumber(source.recentWeeklyRuns),
    recentWeeklyMileage: toNumber(source.recentWeeklyMileage),
    hasRun10k: Boolean(source.hasRun10k),
    trainingDaysPerWeek: clamp(toNumber(source.trainingDaysPerWeek) || 3, 2, 5),
    goalType: source.goalType || 'steady',
    heightCm: toNumber(source.heightCm),
    weightKg: toNumber(source.weightKg),
    symptomStatus: source.symptomStatus || 'steady',
    injuryStatus: source.injuryStatus || 'none',
    restingHeartRate: toNumber(source.restingHeartRate),
    maxHeartRate: toNumber(source.maxHeartRate),
    lactateThresholdHr: toNumber(source.lactateThresholdHr),
    vo2Max: toNumber(source.vo2Max),
    hrv: toNumber(source.hrv),
    sleepHours: toNumber(source.sleepHours)
  };
}

function getProfileAge(profile, dateKey) {
  if (!profile || !profile.birthYear) {
    return 0;
  }

  const year = Number(String(dateKey || getTodayKey()).slice(0, 4));
  if (!Number.isFinite(year)) {
    return 0;
  }

  return Math.max(0, year - Number(profile.birthYear));
}

function buildPersonalPlanBasisNote(profile, dateKey) {
  const notes = ['这份计划会根据你的当前基础、比赛日期和训练频率，优先保证安全和可执行性。'];
  const age = getProfileAge(profile, dateKey);

  if (profile.trainingDaysPerWeek <= 2) {
    notes.push('考虑到你每周可训练时间有限，计划会优先保留关键训练，不追求把课表排满。');
  } else if (profile.trainingDaysPerWeek >= 4) {
    notes.push('你每周有更稳定的训练时间，计划会保留更完整的训练节奏。');
  }

  if (age >= 40) {
    notes.push('按你当前年龄，恢复安排会比年轻跑者更保守一些。');
  } else if (age > 0 && age <= 22) {
    notes.push('按你当前年龄，计划会更强调循序渐进，而不是尽快堆跑量。');
  }

  if (profile.sleepHours > 0 && profile.sleepHours < 7) {
    notes.push('考虑到你最近常态睡眠偏少，计划会多留一些恢复和低强度训练空间。');
  }

  if (profile.injuryStatus === 'recovering') {
    notes.push('当前处于伤后恢复期，计划会用交叉训练和拉伸放松替代部分跑量。');
  }

  return notes.join('');
}

function buildEstimatedMaxHeartRate(profile, dateKey) {
  if (profile.maxHeartRate > 0) {
    return profile.maxHeartRate;
  }

  const age = getProfileAge(profile, dateKey);
  return age > 0 ? 220 - age : 190;
}

function buildHeartRateZones(profile, dateKey) {
  const maxHeartRate = buildEstimatedMaxHeartRate(profile, dateKey);

  return {
    maxHeartRate,
    estimatedFromAge: profile.maxHeartRate <= 0,
    recovery: {
      low: Math.round(maxHeartRate * 0.5),
      high: Math.round(maxHeartRate * 0.65)
    },
    easy: {
      low: Math.round(maxHeartRate * 0.6),
      high: Math.round(maxHeartRate * 0.72)
    },
    long: {
      low: Math.round(maxHeartRate * 0.65),
      high: Math.round(maxHeartRate * 0.78)
    },
    quality: {
      low: Math.round(maxHeartRate * 0.75),
      high: Math.round(maxHeartRate * 0.85)
    },
    cross: {
      low: Math.round(maxHeartRate * 0.6),
      high: Math.round(maxHeartRate * 0.7)
    }
  };
}

function buildHealthSignals(profile, screening, dateKey) {
  const notes = [];
  let riskLevel = screening.riskLevel || 'low';
  let preferLowImpact = false;
  let avoidQuality = false;
  let addCrossTraining = profile.trainingDaysPerWeek >= 4;
  let addBalance = getProfileAge(profile, dateKey) >= 60;

  if (profile.injuryStatus === 'recovering') {
    riskLevel = escalateRisk(riskLevel, 'medium');
    preferLowImpact = true;
    avoidQuality = true;
    addCrossTraining = true;
    addBalance = true;
    notes.push('你当前处于运动损伤恢复期，计划会优先安排低强度有氧、核心力量和拉伸放松。');
  }

  if (profile.injuryStatus === 'current') {
    riskLevel = escalateRisk(riskLevel, 'high');
    preferLowImpact = true;
    avoidQuality = true;
    addCrossTraining = true;
    addBalance = true;
    notes.push('你标记了当前仍有运动损伤，系统不会把你直接推进标准半马强度。');
  }

  if (profile.symptomStatus === 'fatigue') {
    avoidQuality = true;
    addCrossTraining = true;
    notes.push('你最近的身体状态偏疲劳，计划会少一些高强度，多一些低强度恢复。');
  }

  if (profile.symptomStatus === 'discomfort') {
    riskLevel = escalateRisk(riskLevel, 'medium');
    preferLowImpact = true;
    avoidQuality = true;
    addCrossTraining = true;
    notes.push('你最近有明显不适，计划会先压住强度和跑量。');
  }

  if (profile.sleepHours > 0 && profile.sleepHours < 7) {
    avoidQuality = true;
    addCrossTraining = true;
    notes.push('你的常态睡眠不足 7 小时，计划会主动多留恢复空间。');
  }

  if (profile.sleepHours > 0 && profile.sleepHours < 6) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    preferLowImpact = true;
    notes.push('你的常态睡眠不足 6 小时，高强度训练风险会增加。');
  }

  if (profile.hrv > 0 && profile.hrv < 40) {
    avoidQuality = true;
    notes.push('你的HRV偏低，说明身体恢复能力受限，建议减少强度训练。');
  }

  if (profile.hrv > 0 && profile.hrv < 35) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    preferLowImpact = true;
    notes.push('HRV过低时继续高强度训练，受伤风险会明显增加。');
  }

  const heartRateZones = buildHeartRateZones(profile, dateKey);
  const paceZones = trainingPhases.buildPaceZones(profile, inferGoalTypeFromPlan({ currentGoalType: 'standard_finish' }));

  return {
    riskLevel,
    preferLowImpact,
    avoidQuality,
    addCrossTraining,
    addBalance,
    notes,
    heartRateZones,
    paceZones,
    fatigueLevel: trainingPhases.evaluateFatigueLevel(profile, null).level
  };
}

function applyHealthSignalsToScreening(screening, healthSignals) {
  const merged = Object.assign({}, screening, {
    riskLevel: escalateRisk(screening.riskLevel, healthSignals.riskLevel),
    notes: uniqueMessages([].concat(screening.notes || [], healthSignals.notes || []))
  });

  merged.riskLabel = getRiskLabel(merged.riskLevel);
  merged.allowStandardPlan = merged.riskLevel !== 'high';
  return merged;
}

function buildTrainingMixLabels(goalType, healthSignals, canQuality) {
  const labels = ['慢跑 / 长距离慢跑(LSD)', '核心力量'];

  if (canQuality && !healthSignals.avoidQuality && goalType !== 'run_walk_finish') {
    labels.push('节奏跑');
  }

  if (healthSignals.addCrossTraining || goalType === 'run_walk_finish' || healthSignals.preferLowImpact) {
    labels.push('交叉训练');
  }

  labels.push(healthSignals.addBalance ? '拉伸放松' : '拉伸放松');
  return uniqueMessages(labels);
}

function buildPlanMatchFactors(profile, screening, healthSignals, daysToRace, dateKey) {
  const factors = [
    `距离比赛还有 ${daysToRace} 天，计划会按倒计时安排训练和减量。`,
    `你当前最长跑步距离是 ${profile.longestRunKm} 公里，起步长距离不会脱离现状。`,
    `你每周最多能练 ${profile.trainingDaysPerWeek} 天，计划只保留最关键的训练。`
  ];
  const age = getProfileAge(profile, dateKey);

  if (age) {
    factors.push(age >= 40 ? '按你的年龄，恢复提醒会更保守一些。' : '按你的年龄，恢复建议会保持标准节奏。');
  }

  if (screening.riskLevel === 'medium') {
    factors.push('筛查里出现了需要留意的信号，系统自动把强度往下调了一档。');
  }

  if (healthSignals.preferLowImpact) {
    factors.push('你的健康档案显示近期恢复压力更大，系统会用交叉训练和拉伸放松替代部分跑量。');
  }

  if (profile.sleepHours > 0) {
    factors.push(`你填写的常态睡眠约 ${profile.sleepHours} 小时，计划会把恢复空间一起算进去，而不是只堆跑量。`);
  }

  if (healthSignals.heartRateZones) {
    factors.push(
      healthSignals.heartRateZones.estimatedFromAge
        ? '你还没填写最大心率，系统会先按年龄估算心率区间，后面补充数据后会更准确。'
        : '你补充了最大心率，慢跑、长距离和交叉训练都可以给到更准确的心率参考。'
    );
  }

  if (profile.restingHeartRate > 0 || profile.hrv > 0 || profile.vo2Max > 0) {
    factors.push('静息心率、HRV 和 VO₂max 会作为恢复和能力参考，不会只凭单个数值把计划推得太激进。');
  }

  return factors;
}

function normalizePlanState(planStateInput, fallback) {
  const baseState = createDefaultPlanState();
  const rawPlanState = planStateInput && typeof planStateInput === 'object' ? planStateInput : {};
  const fallbackState = fallback && typeof fallback === 'object' ? fallback : {};

  return Object.assign({}, baseState, rawPlanState, {
    currentGoalType: rawPlanState.currentGoalType || fallbackState.currentGoalType || baseState.currentGoalType,
    recommendedGoalType: rawPlanState.recommendedGoalType || '',
    hasRebuiltPlan: Boolean(rawPlanState.hasRebuiltPlan || fallbackState.hasRebuiltPlan),
    rebuildHistory: Array.isArray(rawPlanState.rebuildHistory)
      ? rawPlanState.rebuildHistory
      : Array.isArray(fallbackState.rebuildHistory)
        ? fallbackState.rebuildHistory
        : [],
    longRunMissedStreak: Number.isFinite(Number(rawPlanState.longRunMissedStreak))
      ? Number(rawPlanState.longRunMissedStreak)
      : Number.isFinite(Number(fallbackState.longRunMissedStreak))
        ? Number(fallbackState.longRunMissedStreak)
        : 0,
    riskLevel: rawPlanState.riskLevel || fallbackState.riskLevel || baseState.riskLevel,
    lastRiskTriggerReason: rawPlanState.lastRiskTriggerReason || fallbackState.lastRiskTriggerReason || '',
    planVersion:
      Number.isFinite(Number(rawPlanState.planVersion)) && Number(rawPlanState.planVersion) > 0
        ? Number(rawPlanState.planVersion)
        : Number.isFinite(Number(fallbackState.planVersion)) && Number(fallbackState.planVersion) > 0
          ? Number(fallbackState.planVersion)
          : baseState.planVersion,
    planStatus: rawPlanState.planStatus || fallbackState.planStatus || baseState.planStatus,
    lastRebuiltAt: rawPlanState.lastRebuiltAt || fallbackState.lastRebuiltAt || '',
    keepCurrentGoalConfirmedAt: rawPlanState.keepCurrentGoalConfirmedAt || fallbackState.keepCurrentGoalConfirmedAt || ''
  });
}

function evaluateScreening(answers) {
  const rawAnswers = Object.assign(
    {
      doctorStop: false,
      cardioRisk: false,
      pain: false,
      noRegularExercise: false,
      acuteInjury: false
    },
    answers || {}
  );

  const highReasons = [];
  const mediumReasons = [];

  if (rawAnswers.doctorStop) {
    highReasons.push('医生已经明确提醒你暂不适合做长距离或中高强度训练');
  }

  if (rawAnswers.cardioRisk) {
    highReasons.push('当前存在胸闷胸痛或未控制的心血管风险，不建议直接进入标准训练');
  }

  if (rawAnswers.acuteInjury) {
    highReasons.push('你正处于急性受伤或明显不适恢复期，今天不该继续加训练');
  }

  if (rawAnswers.pain) {
    mediumReasons.push('最近存在持续性膝盖、踝关节或足底疼痛，需要更保守');
  }

  if (rawAnswers.noRegularExercise) {
    mediumReasons.push('最近 3 个月规律运动不足，先把训练节奏垫起来更稳');
  }

  if (rawAnswers.pain && rawAnswers.noRegularExercise) {
    highReasons.push('疼痛和训练基础不足同时存在，继续硬练的风险会明显增加');
  }

  const riskLevel = highReasons.length ? 'high' : mediumReasons.length ? 'medium' : 'low';
  const notes = highReasons.length ? highReasons : mediumReasons;

  return {
    rawAnswers,
    riskLevel,
    riskLabel: getRiskLabel(riskLevel),
    allowStandardPlan: riskLevel !== 'high',
    notes,
    statements: [
      '本产品提供训练建议，不提供医疗诊断。',
      '如果不适持续，请暂停训练并咨询医生或专业人士。',
      '最终训练决策仍需你根据自己的身体状态来判断。'
    ]
  };
}

function classifyTier(profile, screening) {
  if (screening.riskLevel === 'medium') {
    return 'C';
  }

  if (profile.hasRun10k || profile.longestRunKm >= 10) {
    return 'A';
  }

  if (profile.longestRunKm >= 5 || profile.recentWeeklyRuns >= 2 || profile.recentWeeklyMileage >= 12) {
    return 'B';
  }

  return 'C';
}

function resolveGoalType(profile, screening, tier, daysToRace, overrideGoalType, healthSignals) {
  if (overrideGoalType) {
    return {
      currentGoalType: overrideGoalType,
      notes: []
    };
  }

  let currentGoalType = 'standard_finish';
  const notes = [];

  if (screening.riskLevel === 'medium') {
    currentGoalType = 'conservative_finish';
    notes.push('筛查提示存在中风险，计划自动切到更保守的完赛节奏。');
  }

  if (daysToRace < 42) {
    currentGoalType = 'conservative_finish';
    notes.push('距离比赛不足 6 周，这一版只给保守完赛计划。');
  }

  if (daysToRace < 28 && tier === 'C') {
    currentGoalType = 'run_walk_finish';
    notes.push('距离比赛太近且基础偏弱，更建议按跑走结合去准备。');
  }

  if (healthSignals && healthSignals.preferLowImpact && currentGoalType === 'standard_finish') {
    currentGoalType = 'conservative_finish';
    notes.push('健康档案显示你最近更需要恢复和低冲击训练，所以这一版先按更保守的节奏推进。');
  }

  return {
    currentGoalType,
    notes
  };
}

function getPlanMode(goalType, screening, daysToRace) {
  if (screening.riskLevel === 'high') {
    return 'blocked';
  }

  if (goalType === 'standard_finish' && screening.riskLevel === 'low' && daysToRace >= 42) {
    return 'standard';
  }

  return 'conservative';
}

function getModeLabel(mode, goalType) {
  if (mode === 'blocked') {
    return '高风险拦截';
  }

  if (goalType === 'run_walk_finish') {
    return '跑走结合完赛计划';
  }

  if (goalType === 'conservative_finish') {
    return '保守完赛计划';
  }

  return '标准陪跑计划';
}

function getStartLong(profile, tier, mode, goalType) {
  const longest = profile.longestRunKm;

  if (goalType === 'run_walk_finish') {
    return Math.max(4, Math.min(7, roundHalf(longest * 0.7 || 5)));
  }

  if (mode === 'conservative') {
    if (tier === 'A') {
      return Math.max(7, Math.min(10, roundHalf(longest * 0.8 || 8)));
    }

    if (tier === 'B') {
      return Math.max(5.5, Math.min(8, roundHalf(longest * 0.75 || 6)));
    }

    return Math.max(4, Math.min(6.5, roundHalf(longest * 0.7 || 5)));
  }

  if (tier === 'A') {
    return Math.max(8, Math.min(12, roundHalf(longest * 0.85 || 10)));
  }

  if (tier === 'B') {
    return Math.max(6, Math.min(9, roundHalf(longest * 0.8 || 7)));
  }

  return Math.max(4.5, Math.min(7, roundHalf(longest * 0.75 || 5)));
}

function getPeakLong(tier, mode, goalType) {
  if (goalType === 'run_walk_finish') {
    return 12;
  }

  if (goalType === 'conservative_finish') {
    if (tier === 'A') {
      return 15;
    }

    if (tier === 'B') {
      return 13.5;
    }

    return 12;
  }

  if (mode === 'conservative') {
    if (tier === 'A') {
      return 15;
    }
    if (tier === 'B') {
      return 13;
    }
    return 11;
  }

  if (tier === 'A') {
    return 18;
  }
  if (tier === 'B') {
    return 16;
  }
  return 13;
}

function createLongRunTargets(totalWeeks, tier, mode, profile, goalType) {
  if (totalWeeks <= 0) {
    return [];
  }

  if (totalWeeks === 1) {
    return [goalType === 'run_walk_finish' ? 21.1 : 21.1];
  }

  const targets = [];
  const preRaceWeeks = totalWeeks - 1;
  const start = getStartLong(profile, tier, mode, goalType);
  const peak = getPeakLong(tier, mode, goalType);
  const taperWeeks = preRaceWeeks >= 5 ? 2 : 1;
  let current = start;

  for (let weekIndex = 1; weekIndex <= preRaceWeeks; weekIndex += 1) {
    const weeksLeft = preRaceWeeks - weekIndex;
    const isTaper = weeksLeft < taperWeeks;
    const isRecovery = !isTaper && weekIndex > 1 && weekIndex % 4 === 0;

    if (isTaper) {
      const taperFactor = weeksLeft === 0 ? 0.62 : 0.78;
      targets.push(roundHalf(Math.max(start, peak * taperFactor)));
      continue;
    }

    if (isRecovery) {
      current = roundHalf(Math.max(start, current * 0.8));
      targets.push(current);
      continue;
    }

    const increment =
      goalType === 'run_walk_finish'
        ? 0.6
        : mode === 'standard'
          ? tier === 'A'
            ? 1.5
            : tier === 'B'
              ? 1.0
              : 0.8
          : 0.8;

    current = roundHalf(Math.min(peak, current + increment));
    targets.push(current);
  }

  targets.push(21.1);
  return targets;
}

function getWeekPhase(phaseWeekIndex, totalWeeks) {
  const phase = trainingPhases.determinePhase(phaseWeekIndex, totalWeeks);
  return trainingPhases.getPhaseLabel(phase);
}

function getWeekFocus(phaseWeekIndex, totalWeeks, mode, longTarget, goalType) {
  const phase = trainingPhases.determinePhase(phaseWeekIndex, totalWeeks);
  
  if (phaseWeekIndex === totalWeeks) {
    return '把体力留给比赛，前半程保持克制。';
  }

  if (phaseWeekIndex >= totalWeeks - 1) {
    return '本周以减量和恢复为主，不再增加训练量。';
  }

  if (goalType === 'run_walk_finish') {
    return `本周按跑走结合完成 ${longTarget} 公里，比硬撑连续跑更重要。`;
  }

  const phaseFocus = trainingPhases.getPhaseFocus(phase, goalType);
  
  if (mode === 'conservative') {
    return `先把 ${longTarget} 公里的长距离稳稳完成，比速度更重要。`;
  }

  if (phase === 'base') {
    return `本周重点：${phaseFocus}。长距离慢跑 ${longTarget} 公里按轻松节奏完成。`;
  }

  if (phase === 'build') {
    return `本周重点：${phaseFocus}。长距离慢跑 ${longTarget} 公里后程尝试提速。`;
  }

  if (phase === 'peak') {
    return `本周重点：${phaseFocus}。长距离慢跑 ${longTarget} 公里模拟比赛节奏。`;
  }

  return `本周最重要的是长距离慢跑 ${longTarget} 公里，其他训练都可以为它让路。`;
}

function getEasyDistance(longTarget, tier, goalType) {
  const baseDistance = goalType === 'run_walk_finish' ? longTarget * 0.42 : longTarget * 0.48;
  return clamp(roundHalf(baseDistance), tier === 'A' ? 4 : 3, tier === 'A' ? 8 : 6);
}

function buildTask(type, dateKey, context) {
  const longTarget = context.longTarget || 8;
  const easyDistance = getEasyDistance(longTarget, context.tier, context.currentGoalType);
  const qualityDistance = clamp(roundHalf(easyDistance + 1), 4, 8);
  const recoveryDistance = clamp(roundHalf(Math.max(2, easyDistance - 1.5)), 2, 5);
  const heartRateZones = context.heartRateZones;
  const paceZones = context.paceZones;
  const qualityWindow = context.remainingWeeks && context.phaseWeekIndex >= Math.max(2, context.remainingWeeks - 2) ? '节奏控制' : '稍快节奏';

  function getHeartRateNote(zoneKey) {
    if (!heartRateZones || !heartRateZones[zoneKey]) {
      return '';
    }

    return `心率参考 ${heartRateZones[zoneKey].low}-${heartRateZones[zoneKey].high} 次/分`;
  }

  function getHeartRateTarget(zoneKey) {
    if (!heartRateZones || !heartRateZones[zoneKey]) {
      return null;
    }
    const zone = heartRateZones[zoneKey];
    return `${zone.low}-${zone.high} 次/分`;
  }

  function getPaceNote(zoneKey) {
    if (!paceZones || !paceZones[zoneKey + 'Seconds']) {
      return '';
    }
    const pace = paceZones[zoneKey];
    if (!pace) return '';
    return `配速参考 ${pace}/公里`;
  }

  const base = {
    id: `${dateKey}-${type}`,
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    weekIndex: context.weekIndex,
    type,
    priority: type === 'long' ? 'anchor' : 'normal',
    trackable: !['rest'].includes(type)
  };

  if (type === 'easy') {
    const paceNote = getPaceNote('easy');
    return Object.assign(base, {
      title: '慢跑',
      target: `${easyDistance} 公里慢跑`,
      distance: easyDistance,
      purpose: '轻松完成，保持跑步感觉，不追求速度。',
      reasonNote: uniqueMessages(['慢跑的关键是轻松完成，心率控制在有氧区间。', getHeartRateNote('easy'), paceNote]).join(' · '),
      supportActions: ['跑前做 5 分钟动态热身', '跑后做 8-10 分钟拉伸放松'],
      reminder: '全程能正常说话就对了。',
      avoid: '不要拿慢跑日去测试速度。',
      paceTarget: paceZones ? paceZones.easy : null,
      heartRateTarget: getHeartRateTarget('easy')
    });
  }

  if (type === 'quality') {
    const paceNote = getPaceNote('tempo');
    return Object.assign(base, {
      title: '节奏跑',
      target: `${qualityDistance} 公里节奏跑`,
      distance: qualityDistance,
      purpose: '让身体适应目标配速，提升速度耐力。',
      reasonNote: uniqueMessages(['节奏跑是提升速度耐力的关键训练。', getHeartRateNote('quality'), paceNote]).join(' · '),
      supportActions: ['训练前充分热身 10-15 分钟', '结束后做 8-10 分钟腿部拉伸'],
      reminder: '如果感觉明显疲劳，立刻降成慢跑。',
      avoid: '不要因为状态好就跑成测试。',
      paceTarget: paceZones ? paceZones.tempo : null,
      heartRateTarget: getHeartRateTarget('quality')
    });
  }

  if (type === 'long') {
    const modeLabel = context.currentGoalType === 'run_walk_finish' ? '跑走结合' : '慢跑';
    const paceNote = getPaceNote('longRun');
    return Object.assign(base, {
      title: '长距离慢跑(LSD)',
      target: `${longTarget} 公里${modeLabel}`,
      distance: longTarget,
      purpose: '这是本周最核心的训练，直接关系到完赛信心。',
      reasonNote: uniqueMessages(['长距离慢跑是半马备赛最重要的训练。', getHeartRateNote('long'), paceNote]).join(' · '),
      supportActions: ['超过 60 分钟记得补水补能量', '跑后重点放松小腿、臀部和髋部'],
      reminder: '宁可慢一点，也不要硬撑。',
      avoid: '不要因为前几天漏练了，今天拼命补课。',
      paceTarget: paceZones ? paceZones.longRun : null,
      heartRateTarget: getHeartRateTarget('long')
    });
  }

  if (type === 'recovery') {
    const paceNote = getPaceNote('recovery');
    return Object.assign(base, {
      title: '恢复跑',
      target: `${recoveryDistance} 公里恢复跑`,
      distance: recoveryDistance,
      purpose: '促进身体恢复，清除代谢废物。',
      reasonNote: uniqueMessages(['恢复跑的目的是帮助身体恢复，不是训练。', getHeartRateNote('recovery'), paceNote]).join(' · '),
      supportActions: ['如果腿很沉，就改成快走', '结束后做 5-10 分钟轻拉伸'],
      reminder: '今天轻松一点，身体会感谢你。',
      avoid: '不要把恢复日跑成额外训练。',
      paceTarget: paceZones ? paceZones.recovery : null,
      heartRateTarget: getHeartRateTarget('recovery')
    });
  }

  if (type === 'strength') {
    return Object.assign(base, {
      title: '核心力量',
      target: context.healthSignals && context.healthSignals.addBalance ? '20 分钟臀腿力量 + 核心 + 平衡训练' : '20 分钟臀腿力量 + 核心训练',
      purpose: '增强核心稳定，预防运动损伤，提升跑步效率。',
      reasonNote: '力量训练是跑步训练的重要组成部分，能帮助你跑得更稳更远。',
      supportActions: ['深蹲、弓步、臀桥选 2-3 个动作', '每个动作做稳，不追求练到力竭'],
      reminder: '动作质量比数量更重要。',
      avoid: '不要练到第二天腿发软影响跑步。'
    });
  }

  if (type === 'cross') {
    return Object.assign(base, {
      title: '交叉训练',
      target: context.phaseWeekIndex >= Math.max(2, context.remainingWeeks - 2) ? '25-35 分钟低冲击有氧' : '30-45 分钟低冲击有氧',
      purpose: '用低冲击方式维持心肺功能，减少关节压力。',
      reasonNote: uniqueMessages(['骑行、椭圆机、游泳三选一都可以。', getHeartRateNote('cross')]).join(' · '),
      supportActions: ['训练结束后做 8 分钟髋踝活动', '如果状态一般，宁可更轻松也别做成强度课'],
      reminder: '今天的目的是保持有氧，不是刷爆发力。',
      avoid: '不要把交叉训练做成额外比赛。'
    });
  }

  if (type === 'mobility') {
    return Object.assign(base, {
      title: context.healthSignals && context.healthSignals.addBalance ? '拉伸放松' : '拉伸放松',
      target: context.healthSignals && context.healthSignals.addBalance ? '15-20 分钟全身拉伸 + 平衡训练' : '15-20 分钟拉伸 / 瑜伽 / 泡沫轴放松',
      purpose: '放松紧张肌肉，改善身体柔韧性，促进恢复。',
      reasonNote: '拉伸放松是训练的重要组成部分，不是可有可无的。',
      supportActions: ['重点照顾髋、臀、小腿和足底', '全程以舒服和顺畅为主'],
      reminder: '做到身体舒展就够了。',
      avoid: '不要把放松日做成高强度训练。'
    });
  }

  if (type === 'race') {
    return Object.assign(base, {
      title: '比赛日',
      target: `半程马拉松 21.1 公里，目标 ${getGoalLabel(context.currentGoalType)}`,
      purpose: '今天的任务是稳稳完赛，享受比赛过程。',
      reminder: '前半程克制，后半程看状态发挥。',
      avoid: '不要被周围节奏带快。',
      paceTarget: paceZones ? paceZones.halfMarathon : null
    });
  }

  return Object.assign(base, {
    title: '休息日',
    target: '休息或轻松散步 20 分钟',
    purpose: '休息是训练的重要组成部分。',
    reasonNote: '休息不是偷懒，是让身体恢复和适应。',
    supportActions: ['拉伸 10 分钟', '今晚早点休息'],
    reminder: '今天休息好，后面才能继续练。',
    avoid: '不要觉得没跑就必须补课。'
  });
}

function buildWeekTemplate(trainingDays, canQuality, goalType) {
  const healthSignals = arguments[3] || {
    preferLowImpact: false,
    avoidQuality: false,
    addCrossTraining: false
  };

  if (goalType === 'run_walk_finish') {
    if (trainingDays <= 2) {
      return ['easy', 'rest', 'strength', 'rest', 'mobility', 'long', 'rest'];
    }

    return ['easy', 'rest', 'strength', 'cross', 'rest', 'long', 'mobility'];
  }

  if (trainingDays <= 2) {
    return healthSignals.preferLowImpact ? ['cross', 'rest', 'strength', 'rest', 'mobility', 'long', 'rest'] : ['easy', 'rest', 'strength', 'rest', 'mobility', 'long', 'rest'];
  }

  if (trainingDays === 3) {
    if (healthSignals.preferLowImpact || healthSignals.avoidQuality || !canQuality) {
      return ['easy', 'rest', 'strength', 'cross', 'rest', 'long', 'mobility'];
    }

    return ['easy', 'rest', 'strength', 'quality', 'rest', 'long', 'mobility'];
  }

  if (healthSignals.preferLowImpact || healthSignals.avoidQuality) {
    return ['easy', 'strength', 'cross', 'rest', 'mobility', 'long', 'recovery'];
  }

  return healthSignals.addCrossTraining
    ? ['easy', 'strength', canQuality ? 'quality' : 'easy', 'rest', 'cross', 'long', 'mobility']
    : ['easy', 'strength', canQuality ? 'quality' : 'easy', 'rest', 'easy', 'long', 'mobility'];
}

function buildRaceWeekTask(dateKey, daysToRace, context) {
  if (daysToRace === 0) {
    return buildTask('race', dateKey, context);
  }

  if (daysToRace === 1) {
    return buildTask('rest', dateKey, context);
  }

  if (daysToRace === 2 || daysToRace === 4) {
    return Object.assign(buildTask('easy', dateKey, context), {
      target: '20 到 25 分钟轻松跑',
      purpose: '只是把身体唤醒，不是再补训练。',
      reminder: '跑完还应该觉得很轻松。'
    });
  }

  return buildTask('rest', dateKey, context);
}

function generateTrainingPlan(profileInput, screening, todayKey, options) {
  const profile = normalizeProfile(profileInput);
  const generationOptions = options || {};
  const startDateKey = generationOptions.startDateKey || todayKey || getTodayKey();
  const daysToRace = daysBetween(startDateKey, profile.raceDate);
  const remainingWeeks = Math.max(1, Math.floor(daysToRace / 7) + 1);
  const healthSignals = buildHealthSignals(profile, screening, startDateKey);
  const mergedScreening = applyHealthSignalsToScreening(screening, healthSignals);
  const tier = classifyTier(profile, mergedScreening);
  const startingWeekIndex = clamp(toNumber(generationOptions.startingWeekIndex) || 1, 1, 999);
  const goalResolution = resolveGoalType(profile, mergedScreening, tier, daysToRace, generationOptions.currentGoalType, healthSignals);
  const currentGoalType = goalResolution.currentGoalType;
  const mode = getPlanMode(currentGoalType, mergedScreening, daysToRace);
  const warnings = [].concat(goalResolution.notes);

  if (daysToRace > 84) {
    warnings.push('比赛还比较远，前面几周先按基础适应节奏打底。');
  }

  if (daysToRace < 21 && tier === 'C') {
    warnings.push('基础偏弱且比赛很近，建议接受跑走结合而不是硬追标准完赛。');
  }

  warnings.push.apply(warnings, healthSignals.notes);

  if (mode === 'blocked') {
    return {
      generatedAt: new Date().toISOString(),
      startDate: startDateKey,
      mode,
      modeLabel: '高风险拦截',
      tier,
      currentGoal: getInternalGoalFromType(currentGoalType),
      currentGoalType,
      raceDate: profile.raceDate,
      raceName: profile.raceName,
      totalWeeks: startingWeekIndex + remainingWeeks - 1,
      remainingWeeks,
      trainingMixLabels: buildTrainingMixLabels(currentGoalType, healthSignals, false),
      warnings,
      weeks: [],
      tasksByDate: {}
    };
  }

  const longTargets = createLongRunTargets(remainingWeeks, tier, mode, profile, currentGoalType);
  const tasksByDate = {};
  const weeks = [];
  const canQuality =
    profile.trainingDaysPerWeek >= 3 &&
    mode === 'standard' &&
    currentGoalType === 'standard_finish' &&
    tier !== 'C' &&
    !healthSignals.avoidQuality;

  for (let weekOffset = 0; weekOffset < remainingWeeks; weekOffset += 1) {
    const phaseWeekIndex = weekOffset + 1;
    const displayWeekIndex = startingWeekIndex + weekOffset;
    const longTarget = longTargets[weekOffset] || 21.1;
    const template = buildWeekTemplate(
      profile.trainingDaysPerWeek,
      canQuality && phaseWeekIndex < remainingWeeks - 1,
      currentGoalType,
      healthSignals,
      phaseWeekIndex,
      remainingWeeks
    );
    const weekDays = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const offset = weekOffset * 7 + dayIndex;
      const dateKey = getDayKey(addDays(startDateKey, offset));

      if (dateKey > profile.raceDate) {
        break;
      }

      const context = {
        weekIndex: displayWeekIndex,
        longTarget,
        tier,
        currentGoalType,
        phaseWeekIndex,
        remainingWeeks,
        heartRateZones: healthSignals.heartRateZones,
        paceZones: healthSignals.paceZones,
        healthSignals
      };

      const task =
        phaseWeekIndex === remainingWeeks
          ? buildRaceWeekTask(dateKey, daysBetween(dateKey, profile.raceDate), context)
          : buildTask(template[dayIndex], dateKey, context);

      tasksByDate[dateKey] = task;
      weekDays.push(task);
    }

    if (weekDays.length) {
      weeks.push({
        index: displayWeekIndex,
        relativeIndex: phaseWeekIndex,
        label: `第 ${displayWeekIndex} 周`,
        phase: getWeekPhase(phaseWeekIndex, remainingWeeks),
        focus: getWeekFocus(phaseWeekIndex, remainingWeeks, mode, longTarget, currentGoalType),
        longRunTarget: longTarget,
        startDate: weekDays[0].dateKey,
        endDate: weekDays[weekDays.length - 1].dateKey,
        days: weekDays
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    startDate: startDateKey,
    mode,
    modeLabel: getModeLabel(mode, currentGoalType),
    tier,
    currentGoal: getInternalGoalFromType(currentGoalType),
    currentGoalType,
    raceDate: profile.raceDate,
    raceName: profile.raceName,
    totalWeeks: startingWeekIndex + remainingWeeks - 1,
    remainingWeeks,
    planBasisNote: buildPersonalPlanBasisNote(profile, startDateKey),
    planTrustNote:
      currentGoalType === 'standard_finish'
        ? '这不是只靠跑量堆起来的课表，会固定加入核心力量、交叉训练和拉伸放松。'
        : '这是一份更保守的首次半马完赛计划，会优先用低强度训练和恢复把身体保护好。',
    trainingMixLabels: buildTrainingMixLabels(currentGoalType, healthSignals, canQuality),
    matchFactors: buildPlanMatchFactors(profile, mergedScreening, healthSignals, daysToRace, startDateKey),
    warnings,
    weeks,
    tasksByDate
  };
}

function getTaskForDate(plan, dateKey) {
  if (!plan || !plan.tasksByDate) {
    return null;
  }

  return plan.tasksByDate[dateKey] || null;
}

function getCurrentWeek(plan, dateKey) {
  if (!plan || !plan.weeks) {
    return null;
  }

  for (let index = 0; index < plan.weeks.length; index += 1) {
    const week = plan.weeks[index];
    if (dateKey >= week.startDate && dateKey <= week.endDate) {
      return week;
    }
  }

  return plan.weeks[plan.weeks.length - 1] || null;
}

function summarizeWeek(plan, records, dateKey) {
  const week = getCurrentWeek(plan, dateKey);

  if (!week) {
    return {
      week: null,
      completedCount: 0,
      partialCount: 0,
      missedCount: 0,
      plannedCount: 0,
      completionRate: 0,
      longRunDone: false
    };
  }

  let completedCount = 0;
  let partialCount = 0;
  let missedCount = 0;
  let longRunDone = false;
  const plannedItems = week.days.filter((task) => task.trackable);

  plannedItems.forEach((task) => {
    const record = records[task.dateKey];

    if (!record) {
      return;
    }

    if (record.completion === 'full') {
      completedCount += 1;
    }

    if (record.completion === 'partial') {
      partialCount += 1;
    }

    if (record.completion === 'missed') {
      missedCount += 1;
    }

    if (task.type === 'long' && record.completion !== 'missed') {
      longRunDone = true;
    }
  });

  const completionScore = completedCount + partialCount * 0.5;
  const completionRate = plannedItems.length ? Math.round((completionScore / plannedItems.length) * 100) : 0;

  return {
    week,
    completedCount,
    partialCount,
    missedCount,
    plannedCount: plannedItems.length,
    completionRate,
    longRunDone
  };
}

function getRecentTrackableRecords(plan, records, untilDateKey, limit) {
  if (!plan || !plan.tasksByDate) {
    return [];
  }

  const recentTasks = Object.keys(plan.tasksByDate)
    .filter((key) => key <= untilDateKey)
    .sort()
    .reverse()
    .map((key) => plan.tasksByDate[key])
    .filter((task) => task && task.trackable)
    .slice(0, limit || 6);

  return recentTasks
    .map((task) => ({
      task,
      record: records[task.dateKey] || null
    }))
    .filter((item) => item.record);
}

function summarizeRecentFeedback(plan, records, untilDateKey) {
  const recentItems = getRecentTrackableRecords(plan, records, untilDateKey, 6);
  const summary = {
    sampleSize: recentItems.length,
    tiredCount: 0,
    noTimeCount: 0,
    partialCount: 0,
    missedCount: 0,
    lowCompletion: false,
    continuityPoor: false
  };

  recentItems.forEach((item) => {
    const record = item.record;
    if (record.feeling === 'tired' || record.feeling === 'very_tired') {
      summary.tiredCount += 1;
    }

    if (record.issue === 'no_time') {
      summary.noTimeCount += 1;
    }

    if (record.completion === 'partial') {
      summary.partialCount += 1;
    }

    if (record.completion === 'missed') {
      summary.missedCount += 1;
    }
  });

  summary.lowCompletion = summary.sampleSize >= 3 && summary.partialCount >= Math.ceil(summary.sampleSize / 2);
  summary.continuityPoor = summary.sampleSize >= 4 && summary.partialCount + summary.missedCount >= Math.ceil(summary.sampleSize / 2);

  return summary;
}

function buildWeeklyReview(plan, records, dateKey, riskSnapshot) {
  if (!plan || !plan.weeks || !plan.weeks.length) {
    return null;
  }

  const currentDate = toDate(dateKey);
  const dayOfWeek = currentDate.getDay();
  const currentWeek = getCurrentWeek(plan, dateKey);
  const reviewWeek =
    dayOfWeek === 1 && currentWeek
      ? plan.weeks.find((week) => week.index === currentWeek.index - 1) || currentWeek
      : currentWeek;

  if (!reviewWeek) {
    return null;
  }

  const reviewSummary = summarizeWeek(plan, records, reviewWeek.endDate < dateKey ? reviewWeek.endDate : dateKey);
  const reviewItems = [
    `这周你完成了 ${reviewSummary.completedCount + reviewSummary.partialCount}/${reviewSummary.plannedCount || 0} 次训练`,
    reviewSummary.longRunDone ? '这周最关键的长距离已经完成了' : '这周最关键的长距离还没守住',
    reviewSummary.missedCount >= 2 ? '这一周有连续漏训信号，后面别追着补' : '这一周整体节奏还算稳'
  ];

  let nextSuggestion = '下周继续优先保长距离，其他训练都可以给它让路。';
  if (!reviewSummary.longRunDone) {
    nextSuggestion = '下周先把长距离稳住，不要急着补别的训练。';
  } else if (riskSnapshot && riskSnapshot.level === 'high') {
    nextSuggestion = '下周先按保守建议走，重点是别把自己练崩。';
  } else if (reviewSummary.completionRate >= 75) {
    nextSuggestion = '这一周整体不错，下周继续稳住节奏，不需要额外加量。';
  }

  return {
    show: dayOfWeek === 0 || dayOfWeek === 1,
    label: `${reviewWeek.label} 复盘`,
    completionText: `本周完成度 ${reviewSummary.completionRate}%`,
    riskText: riskSnapshot ? `当前风险：${riskSnapshot.label}` : '当前风险：低风险',
    items: reviewItems,
    nextSuggestion
  };
}

function getConsecutiveMisses(records, untilDateKey) {
  const recordKeys = Object.keys(records)
    .filter((key) => key <= untilDateKey)
    .sort()
    .reverse();

  let streak = 0;

  for (let index = 0; index < recordKeys.length; index += 1) {
    const record = records[recordKeys[index]];
    if (record.completion === 'missed') {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getConsecutiveMissesForPlan(plan, records, untilDateKey) {
  if (!plan || !plan.tasksByDate) {
    return getConsecutiveMisses(records, untilDateKey);
  }

  const taskKeys = Object.keys(plan.tasksByDate)
    .filter((key) => key <= untilDateKey)
    .sort()
    .reverse();

  let streak = 0;

  for (let index = 0; index < taskKeys.length; index += 1) {
    const task = plan.tasksByDate[taskKeys[index]];
    if (!task || !task.trackable) {
      continue;
    }

    const record = records[task.dateKey];
    if (record && record.completion === 'missed') {
      streak += 1;
      continue;
    }

    if (record && record.completion !== 'missed') {
      break;
    }
  }

  return streak;
}

function getLongRunMissStreak(plan, records, untilDateKey) {
  if (!plan || !plan.weeks) {
    return 0;
  }

  let streak = 0;

  for (let index = plan.weeks.length - 1; index >= 0; index -= 1) {
    const week = plan.weeks[index];
    const longTask = week.days.find((task) => task.type === 'long');

    if (!longTask || longTask.dateKey > untilDateKey) {
      continue;
    }

    const record = records[longTask.dateKey];
    const done = record && record.completion !== 'missed';

    if (done) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getDowngradeGoalType(currentGoalType, state, dateKey) {
  const daysToRace = state.plan ? daysBetween(dateKey, state.plan.raceDate) : 0;
  const tier = state.plan ? state.plan.tier : 'B';

  if (currentGoalType === 'run_walk_finish') {
    return 'run_walk_finish';
  }

  if (currentGoalType === 'conservative_finish') {
    return 'run_walk_finish';
  }

  if (daysToRace <= 28 || tier === 'C' || (state.plan && state.plan.mode === 'conservative')) {
    return 'run_walk_finish';
  }

  return 'conservative_finish';
}

function buildRiskSnapshot(state, dateKey) {
  const normalizedPlanState = normalizePlanState(state.planState, {
    currentGoalType: inferGoalTypeFromPlan(state.plan),
    riskLevel: state.screening ? state.screening.riskLevel : 'low'
  });
  const baseRisk = state.screening ? state.screening.riskLevel : normalizedPlanState.riskLevel;
  const currentGoalType = normalizedPlanState.currentGoalType;
  const currentGoalLabel = getGoalLabel(currentGoalType);
  const messages = [];
  const reasons = [];
  const recentFeedback = summarizeRecentFeedback(state.plan, state.records || {}, dateKey);
  let riskLevel = baseRisk;
  let planStatus = normalizedPlanState.hasRebuiltPlan ? 'rebuilt' : 'normal';
  let lastRiskTriggerReason = '';
  let recommendedGoalType = '';
  let downgradeTriggered = false;

  if (state.plan && daysBetween(dateKey, state.plan.raceDate) < 10) {
    messages.push('距离比赛不到 10 天，后面只做减量和恢复。');
  }

  if (state.plan && state.plan.mode === 'blocked') {
    riskLevel = 'high';
    planStatus = 'warning';
    lastRiskTriggerReason = '当前状态不适合继续标准训练。';
    reasons.push(lastRiskTriggerReason);
    messages.push('当前状态不适合继续标准训练。');
  }

  const consecutiveMisses = getConsecutiveMissesForPlan(state.plan, state.records || {}, dateKey);
  if (consecutiveMisses >= 2) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    planStatus = 'warning';
    if (!lastRiskTriggerReason) {
      lastRiskTriggerReason = '你已经连续两次没完成训练，这一周先别补高强度。';
    }
    reasons.push('你已经连续两次没完成训练，这一周先别补高强度。');
    messages.push('你已经连续两次没完成训练，这一周不要补高强度。');
  }

  if (recentFeedback.tiredCount >= 2) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    planStatus = planStatus === 'normal' ? 'warning' : planStatus;
    if (!lastRiskTriggerReason) {
      lastRiskTriggerReason = '你最近已经连续几次反馈很累，这周更适合整体降一点。';
    }
    messages.push('你最近连续几次都很累，这周更适合整体降一点。');
  }

  if (recentFeedback.noTimeCount >= 2) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    planStatus = planStatus === 'normal' ? 'warning' : planStatus;
    if (!recommendedGoalType) {
      recommendedGoalType = currentGoalType === 'standard_finish' ? 'conservative_finish' : currentGoalType;
    }
    if (!lastRiskTriggerReason) {
      lastRiskTriggerReason = '你最近连续几次都没时间，当前计划可能比你的真实生活节奏更满。';
    }
    messages.push('你最近连续几次都没时间，当前计划可能排得偏满。');
  }

  if (recentFeedback.lowCompletion) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    planStatus = planStatus === 'normal' ? 'warning' : planStatus;
    messages.push('最近“完成一部分”的比例偏高，后面更应该按没完成来保守处理。');
  }

  if (recentFeedback.continuityPoor) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    planStatus = planStatus === 'normal' ? 'warning' : planStatus;
    messages.push('最近训练连续性一般，先保长距离和恢复，不急着追质量课。');
  }

  const longRunMissedStreak = getLongRunMissStreak(state.plan, state.records || {}, dateKey);
  if (longRunMissedStreak >= 1) {
    riskLevel = escalateRisk(riskLevel, 'medium');
    if (planStatus !== 'downgraded') {
      planStatus = 'warning';
    }
    if (!lastRiskTriggerReason) {
      lastRiskTriggerReason = '长距离是本周最关键的一次训练，缺掉以后先别补。';
    }
    reasons.push('长距离是本周最关键的一次训练，缺掉以后先别补。');
    messages.push('长距离是本周锚点，缺掉以后不要暴力补课。');
  }

  if (longRunMissedStreak >= 2) {
    riskLevel = 'high';
    planStatus = 'downgraded';
    downgradeTriggered = true;
    recommendedGoalType = getDowngradeGoalType(currentGoalType, state, dateKey);
    lastRiskTriggerReason = '你已经连续两周错过最关键的长距离训练，现在继续硬顶原计划，风险会更高。';
    reasons.push(lastRiskTriggerReason);
    messages.push('连续两周没完成长距离，更稳妥的做法是先把目标调低，再重组后面的计划。');
  }

  if (!downgradeTriggered && normalizedPlanState.hasRebuiltPlan && planStatus === 'normal') {
    planStatus = 'rebuilt';
  }

  const recommendedGoalLabel = recommendedGoalType ? getGoalLabel(recommendedGoalType) : '';
  const shouldSuggestRunWalk = recommendedGoalType === 'run_walk_finish';
  const cleanMessages = uniqueMessages(messages).slice(0, 3);
  const nextStep = downgradeTriggered
    ? `更稳妥的做法，是把目标改成${recommendedGoalLabel}，再重组后面的训练。`
    : cleanMessages[0] || '今天先按计划推进。';

  return {
    level: riskLevel,
    label: getRiskLabel(riskLevel),
    planStatus,
    planStatusLabel: getPlanStatusLabel(planStatus),
    messages: cleanMessages,
    longRunMissedStreak,
    currentGoalType,
    currentGoalLabel,
    recommendedGoalType,
    recommendedGoalLabel,
    downgradeTriggered,
    shouldSuggestRunWalk,
    showPlanRiskCard: downgradeTriggered,
    recentFeedback,
    lastRiskTriggerReason,
    cardTitle: '训练计划需要调整',
    cardDescription: '你已经连续两周错过最关键的长距离训练，继续按原计划硬顶，完赛风险会明显上升。',
    cardCurrentAdvice: downgradeTriggered
      ? shouldSuggestRunWalk
        ? '当前建议：改成跑走结合完赛'
        : '当前建议：改成更保守的完赛策略'
      : '',
    nextStep,
    hasRebuiltPlan: normalizedPlanState.hasRebuiltPlan,
    planVersion: normalizedPlanState.planVersion,
    lastRebuiltAt: normalizedPlanState.lastRebuiltAt
  };
}

function syncPlanStateWithRisk(state, dateKey, options) {
  const syncOptions = options || {};
  const fallbackPlanState = normalizePlanState(state.planState, {
    currentGoalType: inferGoalTypeFromPlan(state.plan),
    riskLevel: state.screening ? state.screening.riskLevel : 'low'
  });
  state.planState = fallbackPlanState;

  const snapshot = buildRiskSnapshot(state, dateKey);
  const resolvedPlanStatus =
    syncOptions.forcePlanStatus ||
    (syncOptions.preferRebuilt && state.planState.hasRebuiltPlan && snapshot.planStatus === 'normal' ? 'rebuilt' : snapshot.planStatus);

  state.planState = Object.assign({}, fallbackPlanState, {
    planStatus: resolvedPlanStatus,
    currentGoalType: syncOptions.currentGoalType || fallbackPlanState.currentGoalType,
    recommendedGoalType: snapshot.recommendedGoalType,
    hasRebuiltPlan: syncOptions.hasRebuiltPlan !== undefined ? syncOptions.hasRebuiltPlan : fallbackPlanState.hasRebuiltPlan,
    rebuildHistory: syncOptions.rebuildHistory || fallbackPlanState.rebuildHistory,
    longRunMissedStreak: snapshot.longRunMissedStreak,
    riskLevel: snapshot.level,
    lastRiskTriggerReason: snapshot.lastRiskTriggerReason,
    lastRebuiltAt: syncOptions.lastRebuiltAt || fallbackPlanState.lastRebuiltAt,
    keepCurrentGoalConfirmedAt: syncOptions.keepCurrentGoalConfirmedAt || fallbackPlanState.keepCurrentGoalConfirmedAt
  });

  state.meta = Object.assign({}, state.meta, {
    currentRiskLevel: snapshot.level
  });

  return Object.assign({}, snapshot, {
    planStatus: resolvedPlanStatus,
    planStatusLabel: getPlanStatusLabel(resolvedPlanStatus)
  });
}

function enrichAdjustment(adjustment, snapshot) {
  const trustNote = buildAdjustmentTrustNote(adjustment, snapshot);
  return Object.assign({}, adjustment, {
    currentGoalType: snapshot.currentGoalType,
    currentGoalLabel: snapshot.currentGoalLabel,
    recommendedGoalType: snapshot.recommendedGoalType,
    recommendedGoalLabel: snapshot.recommendedGoalLabel,
    downgradeTriggered: snapshot.downgradeTriggered,
    shouldSuggestRunWalk: snapshot.shouldSuggestRunWalk,
    planStatus: snapshot.planStatus,
    planStatusLabel: snapshot.planStatusLabel,
    longRunMissedStreak: snapshot.longRunMissedStreak,
    lastRiskTriggerReason: snapshot.lastRiskTriggerReason,
    canRebuildPlan: snapshot.downgradeTriggered,
    nextStep: snapshot.nextStep,
    trustNote,
    trustTitle: adjustment.source === 'setup' ? '这份计划为什么这么排' : '为什么这次先这样改'
  });
}

function buildAdjustmentTrustNote(adjustment, snapshot) {
  if (!adjustment || !snapshot) {
    return '';
  }

  if (adjustment.source === 'setup') {
    return '这份计划会根据你的当前基础、比赛日期和训练频率，优先保证安全和可执行性。它不是冲成绩计划，而是偏稳妥的首次半马完赛计划。';
  }

  if (snapshot.downgradeTriggered) {
    return '你已经连续两周错过最关键的长距离训练，现在继续硬顶原计划，完赛风险会明显上升。更稳妥的做法，是先把目标放保守一点，再按重组后的节奏继续。';
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.tiredCount >= 2) {
    return '你最近已经连续几次反馈很累了，这时继续只改一天不太够。先把整周节奏放下来，会比硬顶更稳。';
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.noTimeCount >= 2) {
    return '你最近连续几次都没时间，说明当前计划已经有点超出真实节奏。现在更重要的不是追满每次训练，而是让计划能继续执行下去。';
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.lowCompletion) {
    return '最近“完成一部分”的情况已经偏多了，这时候继续按完成来推训练，容易把风险估低。先按更保守的方式安排，会更靠谱。';
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.continuityPoor) {
    return '最近训练连续性不太稳时，最重要的不是补回所有内容，而是先保住长距离和恢复。';
  }

  if (adjustment.status === 'discomfort') {
    return '身体不舒服时，这一版不会继续往前推强度。先休息和观察，比硬练更重要。';
  }

  if (adjustment.status === 'missed' || adjustment.status === 'no_time') {
    return '一次没跑成不会直接毁掉准备，但为了追进度去补课，反而更容易把后面的节奏一起带偏。';
  }

  if (adjustment.status === 'tired' || adjustment.status === 'keep_current_goal') {
    return '你现在更需要的是恢复和稳住节奏，而不是把每一次训练都硬顶完成。';
  }

  if (adjustment.status === 'rebuilt') {
    return '重组后的计划不会回头追旧课，而是按你现在的状态和剩余时间，把后面的训练重新排得更稳。';
  }

  return '这一版不会为了看起来更聪明而给你激进建议。拿不准的时候，我们会优先给更稳妥的安排。';
}

function createPlanRiskAdjustment(state, dateKey, snapshotInput) {
  const snapshot = snapshotInput || buildRiskSnapshot(state, dateKey);
  return enrichAdjustment(
    {
      source: 'plan-risk',
      status: 'plan_risk',
      dateKey,
      title: snapshot.cardTitle,
      todayAction: '今天先别补丢掉的长距离，也别为了追进度乱加量。',
      tomorrowAction: snapshot.nextStep,
      weekStrategy: '后面只保关键训练，不做暴力补课。',
      reasons: [snapshot.lastRiskTriggerReason],
      riskLevel: snapshot.level,
      riskLabel: snapshot.label,
      generatedAt: new Date().toISOString()
    },
    snapshot
  );
}

function createQuickAdjustment(state, status, dateKey) {
  const task = getTaskForDate(state.plan, dateKey);
  const snapshot = buildRiskSnapshot(state, dateKey);
  let riskLevel = snapshot.level;
  let title = '今天按原计划来';
  let todayAction = task ? `${task.title}：${task.target}` : '今天先按原计划推进。';
  let tomorrowAction = '跑完后再看反馈，明天按计划恢复。';
  let weekStrategy = '本周优先把长距离守住，其他训练都可以让路。';
  let reasons = ['当前没有明显风险信号，可以按原计划走。'];

  if (status === 'tired') {
    title = '今天降一点更稳';
    todayAction = task && task.type === 'quality' ? '把今天的质量课降成 20 到 30 分钟轻松跑。' : '今天只做轻松恢复，或者直接休息。';
    tomorrowAction = '明天不要补强度，按轻松节奏回来就够。';
    weekStrategy = '这一周不补高强度，只把关键训练守住。';
    reasons = ['你已经觉得累了，恢复比硬顶更能保护后面的训练。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.tiredCount >= 2) {
    title = '这一周整体降一点';
    tomorrowAction = '接下来几天优先轻松跑和休息，不再安排高强度。';
    weekStrategy = '你最近已经连续几次反馈很累，这周按周级别降强度更稳。';
    reasons = ['连续几次都觉得累时，继续硬顶很容易把后面训练一起带偏。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.noTimeCount >= 2) {
    title = '计划可以先放保守一点';
    tomorrowAction = '后面只保最关键的训练，如果还是频繁没时间，可以考虑保守版计划。';
    weekStrategy = '这周先按更现实的节奏走，不追求把每次都做满。';
    reasons = ['你最近连续几次都没时间，现在更重要的是让计划能执行下去。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (status === 'no_time') {
    title = '今天不补课';
    todayAction = '没时间就缩成 15 到 20 分钟轻松动一动，或者直接休息。';
    tomorrowAction = '明天回到下一次关键训练，不需要连补两天。';
    weekStrategy = '这一周按优先级做，长距离永远比补零碎训练更重要。';
    reasons = ['时间被打断很正常，关键是别因为焦虑把后面节奏打乱。'];
  }

  if (status === 'discomfort') {
    title = '今天先停下来';
    todayAction = '今天不建议继续任何强度课，先休息和观察。';
    tomorrowAction = '明天也以休息为主；如果不适持续，请暂停训练并咨询医生或专业人士。';
    weekStrategy = '高风险场景下先保护身体，不继续推强度。';
    reasons = ['你反馈了身体不舒服，这类情况不能再按标准训练往前推。'];
    riskLevel = 'high';
  }

  if (status === 'missed') {
    title = '今天先算过去';
    todayAction = '今天没跑成也不要追着补，直接回到下一次最关键的训练。';
    tomorrowAction = '明天按原计划走，如果下一次也是关键课，继续优先保长距离。';
    weekStrategy = '本周不做暴力补课，训练节奏比单次完成更重要。';
    reasons = ['一次没跑成不会毁掉准备，但乱补课很容易把自己练崩。'];
  }

  if (snapshot.downgradeTriggered) {
    title = '训练计划需要调整';
    todayAction = '今天先别补那次长距离，也别继续硬顶原计划。';
    tomorrowAction = snapshot.nextStep;
    weekStrategy = '连续两周缺失长距离后，不再继续追原来的强度和进度。';
    reasons = [snapshot.lastRiskTriggerReason];
    riskLevel = 'high';
  }

  return enrichAdjustment(
    {
      source: 'quick',
      status,
      dateKey,
      title,
      todayAction,
      tomorrowAction,
      weekStrategy,
      reasons,
      riskLevel,
      riskLabel: getRiskLabel(riskLevel),
      generatedAt: new Date().toISOString()
    },
    snapshot
  );
}

function createCheckinAdjustment(state, payload, dateKey) {
  const task = getTaskForDate(state.plan, dateKey);
  const daysToRace = state.plan ? daysBetween(dateKey, state.plan.raceDate) : 0;
  const snapshot = buildRiskSnapshot(state, dateKey);
  let riskLevel = snapshot.level;
  let title = '明天按计划继续';
  let todayAction = '今天的反馈已经记下来了。';
  let tomorrowAction = '明天按原计划推进。';
  let weekStrategy = '继续按当前节奏走，先把本周最重要的一次训练完成。';
  let reasons = ['按你的反馈看，当前状态还可以继续推进。'];

  if (payload.completion === 'partial') {
    title = '今天这样也算保住节奏';
    todayAction = '做了一部分就够了，不需要补完整份训练。';
    tomorrowAction = '明天按计划回来，不额外加码。';
    reasons = ['对新手来说，稳定比一次做满更重要。'];
  }

  if (payload.completion === 'missed') {
    title = '先别补课';
    todayAction = '今天没完成也没关系，先把这一笔放下。';
    tomorrowAction = '明天直接回到下一次关键训练，不安排暴力追课。';
    weekStrategy = '本周不补高强度，训练顺序比数量更重要。';
    reasons = ['一次漏训不会决定结果，但乱补很容易把后面都带偏。'];
  }

  if (payload.feeling === 'tired' || payload.feeling === 'very_tired') {
    title = '明天降一点';
    tomorrowAction = '明天把强度改成轻松跑或休息，不要硬上。';
    weekStrategy = '这一周取消补强度，只保轻松跑和恢复。';
    reasons = ['你今天已经很累了，恢复比多练一节更重要。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.tiredCount >= 2) {
    title = '这一周整体降一点';
    tomorrowAction = '接下来先把质量课都降成轻松跑或休息，等身体回稳再说。';
    weekStrategy = '连续几次都觉得累时，先按周级别降强度，比只改一天更稳。';
    reasons = ['你最近已经连续几次很累了，这时最重要的是把整周节奏放下来。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.noTimeCount >= 2) {
    title = '计划先按现实节奏走';
    tomorrowAction = '后面只保长距离和恢复，如果还是频繁没时间，更建议切到保守版计划。';
    weekStrategy = '训练连续性比每次都做满更重要。';
    reasons = ['你最近连续几次都没时间，说明当前计划可能比你的真实节奏更满。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.lowCompletion) {
    title = '最近更适合按没完成处理';
    tomorrowAction = '后面别再把“做了一部分”当成已经恢复，先按没完成来保守安排。';
    weekStrategy = '这周先保长距离和恢复，不再额外追质量课。';
    reasons = ['最近“做了一部分”的情况偏多，继续按完成来推计划会把风险估低。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.recentFeedback && snapshot.recentFeedback.continuityPoor) {
    weekStrategy = '最近训练连续性一般，优先保长距离和恢复，不优先保质量课。';
  }

  if (payload.feeling === 'discomfort' || payload.issue === 'knee_pain') {
    title = '明天先休息';
    todayAction = '今天先停，别再追加训练。';
    tomorrowAction = '明天只建议休息和观察；如果不适持续，请暂停训练并咨询医生或专业人士。';
    weekStrategy = '高风险场景下直接拦截强度课。';
    reasons = ['你反馈了明显不适，这时最重要的是先把风险压下来。'];
    riskLevel = 'high';
  }

  if (task && task.type === 'long' && payload.completion !== 'full') {
    title = '长距离没守住也别补';
    tomorrowAction = '明天不要把长距离硬补回来，只下调后续训练强度。';
    weekStrategy = '长距离缺失会拉高风险，但补课不是解法。';
    reasons = ['长距离是本周最重要的一次训练，缺掉以后要做的是降负荷，不是追进度。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (snapshot.longRunMissedStreak >= 2) {
    title = '训练计划需要调整';
    todayAction = '今天先别再追那次长距离，也不要想靠下一次硬补回来。';
    tomorrowAction = snapshot.nextStep;
    weekStrategy = '连续两周缺失长距离后，需要主动把目标放稳，再重组后面的计划。';
    reasons = [snapshot.lastRiskTriggerReason];
    riskLevel = 'high';
  } else if (snapshot.longRunMissedStreak >= 1) {
    title = '这周先保长距离';
    tomorrowAction = '后面先把最关键的长距离守住，不用急着补其他训练。';
    weekStrategy = '长距离优先，其他训练都可以为它让路。';
    reasons = ['长距离已经掉过一次，再乱补只会让节奏更乱。'];
    riskLevel = escalateRisk(riskLevel, 'medium');
  }

  if (daysToRace < 10) {
    weekStrategy = '距离比赛不到 10 天，后面只做减量和恢复。';
  }

  return enrichAdjustment(
    {
      source: 'checkin',
      status: payload.completion,
      dateKey,
      title,
      todayAction,
      tomorrowAction,
      weekStrategy,
      reasons,
      riskLevel,
      riskLabel: getRiskLabel(riskLevel),
      generatedAt: new Date().toISOString()
    },
    snapshot
  );
}

function createSetupBundle(profileInput, screeningAnswers, todayKey, options) {
  const setupOptions = options || {};
  const currentDateKey = todayKey || getTodayKey();
  const previousState = setupOptions.previousState || null;
  const profile = normalizeProfile(profileInput);
  const rawScreening = evaluateScreening(screeningAnswers);
  const healthSignals = buildHealthSignals(profile, rawScreening, currentDateKey);
  const screening = applyHealthSignalsToScreening(rawScreening, healthSignals);
  const currentGoalType = setupOptions.currentGoalType;
  const plan = generateTrainingPlan(profile, screening, currentDateKey, {
    currentGoalType,
    startingWeekIndex: setupOptions.startingWeekIndex || 1
  });
  const existingPlanState = normalizePlanState(previousState ? previousState.planState : null, {
    currentGoalType: plan.currentGoalType
  });
  const bundle = {
    profile,
    screening,
    plan,
    planState: Object.assign({}, existingPlanState, {
      currentGoalType: currentGoalType || plan.currentGoalType,
      recommendedGoalType: '',
      longRunMissedStreak: 0,
      lastRiskTriggerReason: ''
    }),
    records: setupOptions.preserveRecords && previousState ? Object.assign({}, previousState.records) : {},
    latestAdjustment: null,
    meta: {
      lastSetupAt: new Date().toISOString(),
      currentRiskLevel: screening.riskLevel
    }
  };
  const snapshot = syncPlanStateWithRisk(bundle, currentDateKey, {
    preferRebuilt: bundle.planState.hasRebuiltPlan
  });

  bundle.latestAdjustment =
    plan.mode === 'blocked'
      ? enrichAdjustment(
          {
            source: 'setup',
            status: 'blocked',
            dateKey: currentDateKey,
            title: '先别进入标准训练',
            todayAction: '当前不建议生成标准半马计划，请先把身体风险处理清楚。',
            tomorrowAction: '如果不适持续，请暂停训练并咨询医生或专业人士。',
            weekStrategy: '高风险用户在这一版里会被强度训练拦截。',
            reasons: screening.notes.length ? screening.notes : ['筛查结果显示当前风险偏高。'],
            riskLevel: 'high',
            riskLabel: getRiskLabel('high'),
            generatedAt: new Date().toISOString()
          },
          snapshot
        )
      : enrichAdjustment(
          {
            source: 'setup',
            status: 'ready',
            dateKey: currentDateKey,
            title: '计划已经生成',
            todayAction: '今天先看清楚当前训练任务，不需要再自己拼课表。',
            tomorrowAction: '后面每天只用关注今天该练什么、哪里别乱练。',
            weekStrategy: '这一周先把最关键的一次长距离守住。',
      reasons: screening.notes.length ? screening.notes : ['你已进入可执行的首场半马陪跑节奏。'],
      riskLevel: snapshot.level,
      riskLabel: snapshot.label,
      trustNote: plan.planBasisNote,
      generatedAt: new Date().toISOString()
    },
    snapshot
  );

  return bundle;
}

function buildNextStateAfterQuickStatus(state, status, dateKey) {
  const nextState = deepClone(state);
  nextState.latestAdjustment = createQuickAdjustment(nextState, status, dateKey);
  const snapshot = syncPlanStateWithRisk(nextState, dateKey, {
    preferRebuilt: nextState.planState && nextState.planState.hasRebuiltPlan
  });
  nextState.latestAdjustment = enrichAdjustment(nextState.latestAdjustment, snapshot);
  nextState.meta.updatedAt = new Date().toISOString();
  nextState.meta.currentRiskLevel = snapshot.level;
  return {
    nextState,
    adjustment: nextState.latestAdjustment
  };
}

function buildNextStateAfterCheckin(state, payload, dateKey) {
  const nextState = deepClone(state);
  const task = getTaskForDate(nextState.plan, dateKey);
  const record = {
    dateKey,
    completion: payload.completion,
    rpe: payload.rpe || 0,
    feeling: payload.feeling,
    issue: payload.issue,
    notes: payload.notes || '',
    taskType: task ? task.type : 'unknown',
    taskTitle: task ? task.title : '',
    createdAt: new Date().toISOString()
  };

  nextState.records[dateKey] = record;
  nextState.latestAdjustment = createCheckinAdjustment(nextState, payload, dateKey);
  const snapshot = syncPlanStateWithRisk(nextState, dateKey, {
    preferRebuilt: nextState.planState && nextState.planState.hasRebuiltPlan
  });
  nextState.latestAdjustment = enrichAdjustment(nextState.latestAdjustment, snapshot);
  nextState.meta.lastCheckinAt = record.createdAt;
  nextState.meta.updatedAt = record.createdAt;
  nextState.meta.currentRiskLevel = snapshot.level;

  return {
    nextState,
    adjustment: nextState.latestAdjustment,
    record
  };
}

function buildNextStateForPlanRisk(state, dateKey) {
  const nextState = deepClone(state);
  const snapshot = syncPlanStateWithRisk(nextState, dateKey, {
    preferRebuilt: nextState.planState && nextState.planState.hasRebuiltPlan
  });
  nextState.latestAdjustment = createPlanRiskAdjustment(nextState, dateKey, snapshot);
  nextState.meta.updatedAt = new Date().toISOString();
  nextState.meta.currentRiskLevel = snapshot.level;

  return {
    nextState,
    adjustment: nextState.latestAdjustment
  };
}

function buildNextStateAfterKeepCurrentGoal(state, dateKey) {
  const nextState = deepClone(state);
  const confirmedAt = new Date().toISOString();
  nextState.planState = normalizePlanState(nextState.planState, {
    currentGoalType: inferGoalTypeFromPlan(nextState.plan)
  });
  nextState.planState.keepCurrentGoalConfirmedAt = confirmedAt;
  const snapshot = syncPlanStateWithRisk(nextState, dateKey, {
    preferRebuilt: nextState.planState.hasRebuiltPlan,
    keepCurrentGoalConfirmedAt: confirmedAt
  });
  nextState.latestAdjustment = enrichAdjustment(
    {
      source: 'keep-goal',
      status: 'keep_current_goal',
      dateKey,
      title: '已记录你想继续当前目标',
      todayAction: '系统会按你的选择保留当前目标，但这不代表风险已经消失。',
      tomorrowAction: '接下来别补长距离，也别追强度；如果状态继续不好，更建议尽快重组计划。',
      weekStrategy: '本周先保恢复和关键训练，不继续硬顶。',
      reasons: [snapshot.lastRiskTriggerReason],
      riskLevel: snapshot.level,
      riskLabel: snapshot.label,
      generatedAt: confirmedAt
    },
    snapshot
  );
  nextState.meta.updatedAt = confirmedAt;
  nextState.meta.currentRiskLevel = snapshot.level;

  return {
    nextState,
    adjustment: nextState.latestAdjustment
  };
}

function buildNextStateAfterRebuildPlan(state, dateKey, options) {
  const rebuildOptions = options || {};
  const nextState = deepClone(state);
  nextState.planState = normalizePlanState(nextState.planState, {
    currentGoalType: inferGoalTypeFromPlan(nextState.plan)
  });
  const riskSnapshot = syncPlanStateWithRisk(nextState, dateKey, {
    preferRebuilt: nextState.planState.hasRebuiltPlan
  });
  const targetGoalType =
    rebuildOptions.goalType ||
    riskSnapshot.recommendedGoalType ||
    nextState.planState.recommendedGoalType ||
    nextState.planState.currentGoalType;
  const currentWeek = getCurrentWeek(nextState.plan, dateKey);
  const nextPlanVersion = nextState.planState.planVersion + 1;
  const rebuiltAt = new Date().toISOString();
  const historyItem = {
    planVersion: nextPlanVersion,
    rebuiltAt,
    rebuildDateKey: dateKey,
    fromGoalType: nextState.planState.currentGoalType,
    toGoalType: targetGoalType,
    reason: riskSnapshot.lastRiskTriggerReason || '按当前风险建议重组计划'
  };

  nextState.plan = generateTrainingPlan(nextState.profile, nextState.screening, dateKey, {
    currentGoalType: targetGoalType,
    startingWeekIndex: currentWeek ? currentWeek.index : 1,
    isRebuilt: true
  });

  nextState.planState = Object.assign({}, nextState.planState, {
    planVersion: nextPlanVersion,
    currentGoalType: targetGoalType,
    recommendedGoalType: '',
    hasRebuiltPlan: true,
    rebuildHistory: [].concat(nextState.planState.rebuildHistory || [], historyItem),
    lastRebuiltAt: rebuiltAt,
    keepCurrentGoalConfirmedAt: ''
  });

  const rebuiltSnapshot = syncPlanStateWithRisk(nextState, dateKey, {
    preferRebuilt: true,
    currentGoalType: targetGoalType,
    hasRebuiltPlan: true,
    rebuildHistory: nextState.planState.rebuildHistory,
    lastRebuiltAt: rebuiltAt
  });

  nextState.latestAdjustment = enrichAdjustment(
    {
      source: 'rebuild',
      status: 'rebuilt',
      dateKey,
      title: '后面的计划已经重组好了',
      todayAction: `系统已经把目标切到${getGoalLabel(targetGoalType)}，后面按新的节奏继续就好。`,
      tomorrowAction: '接下来先把新的关键训练守住，不需要回头补旧计划。',
      weekStrategy: '这是一份重组后的更保守计划，重点是把后面的训练跑稳。',
      reasons: [historyItem.reason],
      riskLevel: rebuiltSnapshot.level,
      riskLabel: rebuiltSnapshot.label,
      generatedAt: rebuiltAt
    },
    rebuiltSnapshot
  );
  nextState.meta.updatedAt = rebuiltAt;
  nextState.meta.currentRiskLevel = rebuiltSnapshot.level;

  return {
    nextState,
    adjustment: nextState.latestAdjustment,
    historyItem
  };
}

function buildMotivationText(task, riskSnapshot, daysToRace) {
  if (!task) {
    return '今天先看看计划，明天开始也不晚。';
  }

  if (task.type === 'rest') {
    if (daysToRace <= 3) {
      return '休息也是备战的一部分，把体力留给比赛。';
    }
    return '今天不跑不是偷懒，是在为后面的关键训练蓄力。';
  }

  if (task.type === 'long') {
    if (riskSnapshot && riskSnapshot.level === 'high') {
      return '长距离慢跑不用硬撑，稳稳完成比什么都重要。';
    }
    return '今天这次长距离慢跑，是你离完赛目标最近的一步。';
  }

  if (task.type === 'quality') {
    return '节奏跑不是比谁更快，是让身体适应目标配速。';
  }

  if (task.type === 'easy') {
    return '慢跑不是偷懒，是在为后面的关键训练蓄力。';
  }

  if (task.type === 'recovery') {
    return '没必要每次都拼命，把今天稳稳跑完更重要。';
  }

  if (task.type === 'strength') {
    return '核心力量训练不是附加题，是让你后半程不掉速的底气。';
  }

  if (task.type === 'cross') {
    return '换一种方式练心肺，也是对关节的保护。';
  }

  if (task.type === 'mobility') {
    return '拉伸放松是训练的重要组成部分，不是可有可无。';
  }

  if (task.type === 'race') {
    return '今天不是证明自己有多快，而是稳稳完赛、享受比赛。';
  }

  if (riskSnapshot && riskSnapshot.level !== 'low') {
    return '你现在最需要的不是更狠，而是更稳。';
  }

  return '把今天的训练稳稳完成，比什么都重要。';
}

function rescheduleAfterBlackout(state) {
  if (!state.profile || !state.plan) return null;

  const blackoutDates = state.profile.blackoutDates || [];
  if (blackoutDates.length === 0) return null;

  const nextState = JSON.parse(JSON.stringify(state));
  const tasksByDate = nextState.plan.tasksByDate;

  blackoutDates.forEach(dateKey => {
    if (tasksByDate[dateKey]) {
      tasksByDate[dateKey] = {
        ...tasksByDate[dateKey],
        type: 'rest',
        title: '黑名单休息日',
        target: '不安排训练',
        purpose: '该日期已标记为不可训练',
        trackable: false
      };
    }
  });

  return { nextState };
}

module.exports = {
  GOAL_TYPE_LABELS,
  PLAN_STATUS_LABELS,
  QUICK_STATUS_LABELS,
  buildHeartRateZones,
  buildMotivationText,
  buildNextStateAfterCheckin,
  buildNextStateAfterKeepCurrentGoal,
  buildNextStateAfterQuickStatus,
  buildNextStateAfterRebuildPlan,
  buildNextStateForPlanRisk,
  buildRiskSnapshot,
  createPlanRiskAdjustment,
  createSetupBundle,
  evaluateScreening,
  generateTrainingPlan,
  buildWeeklyReview,
  getCurrentWeek,
  getGoalLabel,
  getPlanStatusLabel,
  getRiskLabel,
  getTaskForDate,
  getLongRunMissStreak,
  inferGoalTypeFromPlan,
  rescheduleAfterBlackout,
  summarizeWeek,
  syncPlanStateWithRisk
};
