const { clamp, toNumber } = require('./date');

const PHASE_LABELS = {
  base: '适应期',
  build: '提升期',
  peak: '赛前强化期',
  race: '比赛周'
};

const PHASE_DESCRIPTIONS = {
  base: '打好有氧基础，循序渐进增加跑量，培养跑步习惯',
  build: '提升专项能力，加入节奏跑训练，增强速度耐力',
  peak: '模拟比赛强度，巩固目标配速，提升抗疲劳能力',
  race: '减量调整，保持身体状态，蓄力迎接比赛'
};

function determinePhase(weekIndex, totalWeeks) {
  if (totalWeeks <= 4) {
    if (weekIndex === totalWeeks) return 'race';
    if (weekIndex >= totalWeeks - 1) return 'peak';
    return 'base';
  }

  if (totalWeeks <= 8) {
    if (weekIndex === totalWeeks) return 'race';
    if (weekIndex >= totalWeeks - 1) return 'peak';
    if (weekIndex <= 2) return 'base';
    return 'build';
  }

  if (totalWeeks <= 12) {
    if (weekIndex === totalWeeks) return 'race';
    if (weekIndex >= totalWeeks - 1) return 'peak';
    if (weekIndex <= 3) return 'base';
    if (weekIndex <= 7) return 'build';
    return 'peak';
  }

  const baseEnd = Math.floor(totalWeeks * 0.35);
  const buildEnd = Math.floor(totalWeeks * 0.7);
  const peakEnd = totalWeeks - 1;

  if (weekIndex === totalWeeks) return 'race';
  if (weekIndex > peakEnd) return 'race';
  if (weekIndex > buildEnd) return 'peak';
  if (weekIndex > baseEnd) return 'build';
  return 'base';
}

function getPhaseLabel(phase) {
  return PHASE_LABELS[phase] || PHASE_LABELS.base;
}

function getPhaseDescription(phase) {
  return PHASE_DESCRIPTIONS[phase] || PHASE_DESCRIPTIONS.base;
}

function getPhaseWeekRange(phase, totalWeeks) {
  if (totalWeeks <= 4) {
    switch (phase) {
      case 'base': return { start: 1, end: totalWeeks - 2 };
      case 'peak': return { start: totalWeeks - 1, end: totalWeeks - 1 };
      case 'race': return { start: totalWeeks, end: totalWeeks };
      default: return { start: 1, end: 1 };
    }
  }

  if (totalWeeks <= 8) {
    switch (phase) {
      case 'base': return { start: 1, end: 2 };
      case 'build': return { start: 3, end: totalWeeks - 2 };
      case 'peak': return { start: totalWeeks - 1, end: totalWeeks - 1 };
      case 'race': return { start: totalWeeks, end: totalWeeks };
      default: return { start: 1, end: 1 };
    }
  }

  if (totalWeeks <= 12) {
    switch (phase) {
      case 'base': return { start: 1, end: 3 };
      case 'build': return { start: 4, end: 7 };
      case 'peak': return { start: 8, end: totalWeeks - 1 };
      case 'race': return { start: totalWeeks, end: totalWeeks };
      default: return { start: 1, end: 1 };
    }
  }

  const baseEnd = Math.floor(totalWeeks * 0.35);
  const buildEnd = Math.floor(totalWeeks * 0.7);

  switch (phase) {
    case 'base': return { start: 1, end: baseEnd };
    case 'build': return { start: baseEnd + 1, end: buildEnd };
    case 'peak': return { start: buildEnd + 1, end: totalWeeks - 1 };
    case 'race': return { start: totalWeeks, end: totalWeeks };
    default: return { start: 1, end: 1 };
  }
}

function getPhaseFocus(phase, goalType) {
  const focusMap = {
    base: {
      standard_finish: '以慢跑为主，每周一次长距离慢跑(LSD)，配合核心力量训练',
      conservative_finish: '轻松跑为主，建立跑步习惯，重视力量和柔韧性',
      run_walk_finish: '建立跑走结合节奏，低冲击有氧为主，循序渐进'
    },
    build: {
      standard_finish: '加入节奏跑训练，长距离后程提速，提升乳酸清除能力',
      conservative_finish: '稳定长距离，尝试短段节奏跑，保持轻松跑为主',
      run_walk_finish: '延长跑走结合时间，加入低强度节奏适应'
    },
    peak: {
      standard_finish: '目标配速适应，混氧训练，提升后半程抗疲劳能力',
      conservative_finish: '稳定目标配速，长距离模拟比赛节奏',
      run_walk_finish: '模拟比赛节奏，优化跑走配比'
    },
    race: {
      standard_finish: '减量30-50%，保持短程速度感，注意碳水补充',
      conservative_finish: '以减量为主，轻松跑保持状态，充分休息',
      run_walk_finish: '轻松活动为主，保持身体活跃度'
    }
  };

  return focusMap[phase] && focusMap[phase][goalType] || focusMap[phase].standard_finish;
}

function formatPace(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm <= 0) return '';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
}

function parsePace(paceString) {
  if (!paceString) return 0;
  const match = paceString.match(/(\d+)[':](\d+)/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function calculatePaceFrom10K(tenKPaceSeconds, goalType) {
  if (!tenKPaceSeconds || tenKPaceSeconds <= 0) {
    return null;
  }

  const marathonFactor = goalType === 'standard_finish' ? 1.08 : 1.12;
  const halfMarathonFactor = goalType === 'standard_finish' ? 1.04 : 1.07;

  const marathonPace = tenKPaceSeconds * marathonFactor;
  const halfMarathonPace = tenKPaceSeconds * halfMarathonFactor;
  const longRunPace = halfMarathonPace + 15;
  const easyPace = halfMarathonPace + 45;
  const recoveryPace = halfMarathonPace + 75;
  const tempoPace = tenKPaceSeconds + 20;
  const intervalPace = tenKPaceSeconds - 25;

  return {
    tenK: formatPace(tenKPaceSeconds),
    halfMarathon: formatPace(halfMarathonPace),
    marathon: formatPace(marathonPace),
    longRun: formatPace(longRunPace),
    easy: formatPace(easyPace),
    recovery: formatPace(recoveryPace),
    tempo: formatPace(tempoPace),
    interval: formatPace(Math.max(intervalPace, 180)),
    tenKSeconds: tenKPaceSeconds,
    halfMarathonSeconds: halfMarathonPace,
    marathonSeconds: marathonPace,
    longRunSeconds: longRunPace,
    easySeconds: easyPace,
    recoverySeconds: recoveryPace,
    tempoSeconds: tempoPace,
    intervalSeconds: Math.max(intervalPace, 180)
  };
}

function estimate10KPaceFromProfile(profile) {
  if (!profile) return 360;

  if (profile.tenKPace) {
    return parsePace(profile.tenKPace);
  }

  const longestRun = profile.longestRunKm || 5;
  const weeklyMileage = profile.recentWeeklyMileage || 10;

  let basePace = 360;

  if (longestRun >= 15) {
    basePace = 270;
  } else if (longestRun >= 10) {
    basePace = 300;
  } else if (longestRun >= 7) {
    basePace = 330;
  } else if (longestRun >= 5) {
    basePace = 360;
  } else {
    basePace = 420;
  }

  if (weeklyMileage >= 30) {
    basePace -= 30;
  } else if (weeklyMileage >= 20) {
    basePace -= 15;
  } else if (weeklyMileage < 10) {
    basePace += 30;
  }

  return Math.max(240, basePace);
}

function buildPaceZones(profile, goalType) {
  const tenKPaceSeconds = estimate10KPaceFromProfile(profile);

  return calculatePaceFrom10K(tenKPaceSeconds, goalType || 'standard_finish');
}

function evaluateFatigueLevel(profile, recentRecords) {
  let score = 0;
  const signals = [];

  if (profile.hrv > 0 && profile.hrv < 40) {
    score += 2;
    signals.push('HRV偏低，身体恢复能力下降');
  } else if (profile.hrv >= 40 && profile.hrv < 50) {
    score += 1;
    signals.push('HRV略低，注意恢复');
  }

  if (profile.sleepHours > 0 && profile.sleepHours < 6) {
    score += 2;
    signals.push('睡眠严重不足，影响恢复');
  } else if (profile.sleepHours >= 6 && profile.sleepHours < 7) {
    score += 1;
    signals.push('睡眠略少，注意休息');
  }

  if (profile.symptomStatus === 'fatigue') {
    score += 1;
    signals.push('主观感觉疲劳');
  }

  if (recentRecords && recentRecords.length >= 3) {
    const recentTiredCount = recentRecords.filter(function(r) {
      return r.feeling === 'tired' || r.feeling === 'very_tired';
    }).length;

    if (recentTiredCount >= 2) {
      score += 1;
      signals.push('近期多次反馈疲劳');
    }
  }

  let level = 'low';
  if (score >= 4) {
    level = 'high';
  } else if (score >= 2) {
    level = 'medium';
  }

  return {
    level,
    score,
    signals,
    shouldAvoidQuality: level === 'high',
    shouldReduceVolume: level === 'high',
    needsExtraRecovery: level === 'medium' || level === 'high'
  };
}

function shouldCancelQualitySession(profile, recentRecords, daysToRace) {
  if (daysToRace < 10) {
    return {
      cancel: true,
      reason: '距离比赛不足10天，不再安排质量课'
    };
  }

  const fatigue = evaluateFatigueLevel(profile, recentRecords);

  if (fatigue.level === 'high') {
    return {
      cancel: true,
      reason: '疲劳水平过高，取消质量课'
    };
  }

  if (profile.sleepHours > 0 && profile.sleepHours < 6) {
    return {
      cancel: true,
      reason: '睡眠不足6小时，取消质量课'
    };
  }

  if (profile.hrv > 0 && profile.hrv < 35) {
    return {
      cancel: true,
      reason: 'HRV过低，取消质量课'
    };
  }

  return {
    cancel: false,
    reason: ''
  };
}

function getRecoveryRecommendation(fatigueLevel, daysToRace) {
  if (fatigueLevel === 'high') {
    return {
      primaryAction: '休息或极轻松活动',
      secondaryAction: '取消所有强度训练',
      duration: '至少2天',
      warning: '如果状态持续不佳，建议咨询专业人士'
    };
  }

  if (fatigueLevel === 'medium') {
    return {
      primaryAction: '轻松跑或交叉训练',
      secondaryAction: '降低训练强度',
      duration: '1-2天',
      warning: '注意睡眠和营养补充'
    };
  }

  return {
    primaryAction: '按计划训练',
    secondaryAction: '保持正常恢复节奏',
    duration: '',
    warning: ''
  };
}

function buildEnhancedHealthSignals(profile, screening, recentRecords, dateKey) {
  const baseSignals = {
    riskLevel: screening.riskLevel || 'low',
    preferLowImpact: false,
    avoidQuality: false,
    addCrossTraining: false,
    addBalance: false,
    notes: []
  };

  const fatigue = evaluateFatigueLevel(profile, recentRecords);

  if (fatigue.level === 'high') {
    baseSignals.riskLevel = baseSignals.riskLevel === 'high' ? 'high' : 'medium';
    baseSignals.avoidQuality = true;
    baseSignals.preferLowImpact = true;
    baseSignals.notes.push('当前疲劳水平较高，建议优先恢复。');
  }

  if (fatigue.level === 'medium') {
    baseSignals.avoidQuality = true;
    baseSignals.notes.push('疲劳水平中等，强度训练需谨慎。');
  }

  if (profile.sleepHours > 0 && profile.sleepHours < 6) {
    baseSignals.avoidQuality = true;
    baseSignals.notes.push('睡眠不足6小时，取消高强度训练。');
  }

  if (profile.hrv > 0 && profile.hrv < 40) {
    baseSignals.avoidQuality = true;
    baseSignals.notes.push('HRV偏低，身体恢复能力受限。');
  }

  return Object.assign({}, baseSignals, {
    fatigueLevel: fatigue.level,
    fatigueScore: fatigue.score,
    fatigueSignals: fatigue.signals
  });
}

function getIntensityDistribution(phase, goalType) {
  const distributions = {
    base: {
      standard_finish: { easy: 80, quality: 5, long: 15 },
      conservative_finish: { easy: 85, quality: 0, long: 15 },
      run_walk_finish: { easy: 85, quality: 0, long: 15 }
    },
    build: {
      standard_finish: { easy: 70, quality: 15, long: 15 },
      conservative_finish: { easy: 80, quality: 5, long: 15 },
      run_walk_finish: { easy: 85, quality: 0, long: 15 }
    },
    peak: {
      standard_finish: { easy: 65, quality: 20, long: 15 },
      conservative_finish: { easy: 75, quality: 10, long: 15 },
      run_walk_finish: { easy: 85, quality: 0, long: 15 }
    },
    race: {
      standard_finish: { easy: 90, quality: 5, long: 5 },
      conservative_finish: { easy: 95, quality: 0, long: 5 },
      run_walk_finish: { easy: 95, quality: 0, long: 5 }
    }
  };

  return distributions[phase] && distributions[phase][goalType] || distributions.base.standard_finish;
}

module.exports = {
  determinePhase,
  getPhaseLabel,
  getPhaseDescription,
  getPhaseWeekRange,
  getPhaseFocus,
  formatPace,
  parsePace,
  calculatePaceFrom10K,
  estimate10KPaceFromProfile,
  buildPaceZones,
  evaluateFatigueLevel,
  shouldCancelQualitySession,
  getRecoveryRecommendation,
  buildEnhancedHealthSignals,
  getIntensityDistribution,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS
};
