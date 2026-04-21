const { addDays, formatDate } = require('./util');

const LOAD_CONSTANTS = {
  ATL_TIME_CONSTANT: 7,
  CTL_TIME_CONSTANT: 42,
  RPE_SCALE: {
    MIN: 1,
    MAX: 10
  }
};

function calculateSRPE(duration, rpe) {
  if (!duration || !rpe) return 0;
  const clampedRPE = Math.max(LOAD_CONSTANTS.RPE_SCALE.MIN, 
                              Math.min(LOAD_CONSTANTS.RPE_SCALE.MAX, rpe));
  return duration * clampedRPE;
}

function calculateEWMA(values, timeConstant) {
  if (!values || values.length === 0) return 0;
  
  const k = 2 / (timeConstant + 1);
  let ewma = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ewma = k * values[i] + (1 - k) * ewma;
  }
  
  return ewma;
}

function calculateATL(dailyLoads) {
  if (!dailyLoads || dailyLoads.length === 0) return 0;
  
  const recentLoads = dailyLoads.slice(-LOAD_CONSTANTS.ATL_TIME_CONSTANT);
  return calculateEWMA(recentLoads, LOAD_CONSTANTS.ATL_TIME_CONSTANT);
}

function calculateCTL(dailyLoads) {
  if (!dailyLoads || dailyLoads.length === 0) return 0;
  
  const recentLoads = dailyLoads.slice(-LOAD_CONSTANTS.CTL_TIME_CONSTANT);
  return calculateEWMA(recentLoads, LOAD_CONSTANTS.CTL_TIME_CONSTANT);
}

function calculateTSB(ctl, atl) {
  return ctl - atl;
}

function calculateTrainingLoad(records, untilDate) {
  if (!records || Object.keys(records).length === 0) {
    return {
      atl: 0,
      ctl: 0,
      tsb: 0,
      dailyLoads: [],
      weeklyLoad: 0,
      monthlyLoad: 0
    };
  }

  const sortedDates = Object.keys(records)
    .filter(date => date <= untilDate)
    .sort();

  if (sortedDates.length === 0) {
    return {
      atl: 0,
      ctl: 0,
      tsb: 0,
      dailyLoads: [],
      weeklyLoad: 0,
      monthlyLoad: 0
    };
  }

  const dailyLoads = [];
  const startDate = sortedDates[0];
  const endDate = untilDate;
  
  let currentDate = startDate;
  while (currentDate <= endDate) {
    const record = records[currentDate];
    let dailyLoad = 0;
    
    if (record && record.completion !== 'missed') {
      const duration = record.duration || 30;
      const rpe = record.rpe || 5;
      dailyLoad = calculateSRPE(duration, rpe);
    }
    
    dailyLoads.push({
      date: currentDate,
      load: dailyLoad
    });
    
    currentDate = formatDate(addDays(new Date(currentDate), 1));
  }

  const loads = dailyLoads.map(d => d.load);
  const atl = calculateATL(loads);
  const ctl = calculateCTL(loads);
  const tsb = calculateTSB(ctl, atl);

  const weeklyLoad = loads.slice(-7).reduce((sum, load) => sum + load, 0);
  const monthlyLoad = loads.slice(-30).reduce((sum, load) => sum + load, 0);

  return {
    atl: Math.round(atl * 10) / 10,
    ctl: Math.round(ctl * 10) / 10,
    tsb: Math.round(tsb * 10) / 10,
    dailyLoads,
    weeklyLoad: Math.round(weeklyLoad),
    monthlyLoad: Math.round(monthlyLoad)
  };
}

function interpretTSB(tsb) {
  if (tsb > 15) {
    return {
      status: 'very_fresh',
      label: '非常新鲜',
      description: '身体恢复很好，适合高强度训练或比赛',
      recommendation: '可以进行高强度训练或测试'
    };
  } else if (tsb > 5) {
    return {
      status: 'fresh',
      label: '较新鲜',
      description: '身体状态良好，可以进行质量课',
      recommendation: '适合进行节奏跑或间歇训练'
    };
  } else if (tsb > -10) {
    return {
      status: 'neutral',
      label: '中性',
      description: '训练负荷适中，继续保持',
      recommendation: '按计划进行训练'
    };
  } else if (tsb > -30) {
    return {
      status: 'fatigued',
      label: '疲劳',
      description: '训练负荷较高，需要更多恢复',
      recommendation: '减少训练强度，增加恢复时间'
    };
  } else {
    return {
      status: 'very_fatigued',
      label: '过度疲劳',
      description: '训练负荷过高，需要立即调整',
      recommendation: '建议休息或只做轻松活动'
    };
  }
}

function calculateTrainingMonotony(dailyLoads) {
  if (!dailyLoads || dailyLoads.length < 7) return 0;

  const loads = dailyLoads.slice(-7).map(d => d.load);
  const mean = loads.reduce((sum, load) => sum + load, 0) / loads.length;
  
  if (mean === 0) return 0;

  const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? mean / stdDev : 0;
}

function calculateTrainingStrain(weeklyLoad, monotony) {
  return weeklyLoad * monotony;
}

function assessRiskLevel(loadData) {
  const { atl, ctl, tsb, weeklyLoad, monotony } = loadData;

  let riskLevel = 'low';
  const warnings = [];

  if (tsb < -30) {
    riskLevel = 'high';
    warnings.push('训练负荷过高，身体处于过度疲劳状态');
  } else if (tsb < -10) {
    riskLevel = 'medium';
    warnings.push('训练负荷偏高，需要注意恢复');
  }

  if (monotony > 2.0) {
    if (riskLevel === 'low') riskLevel = 'medium';
    warnings.push('训练变化不足，建议增加多样性');
  }

  const weeklyLoadThreshold = ctl * 1.3;
  if (weeklyLoad > weeklyLoadThreshold) {
    if (riskLevel === 'low') riskLevel = 'medium';
    warnings.push('本周训练负荷增长过快');
  }

  return {
    level: riskLevel,
    warnings,
    recommendations: generateRecommendations(riskLevel, tsb)
  };
}

function generateRecommendations(riskLevel, tsb) {
  const recommendations = [];

  if (riskLevel === 'high') {
    recommendations.push('建议立即减少训练量50%以上');
    recommendations.push('增加恢复日，优先保证睡眠');
    recommendations.push('如果疲劳持续，请咨询专业人士');
  } else if (riskLevel === 'medium') {
    recommendations.push('建议本周减少10-20%训练量');
    recommendations.push('增加轻松跑和恢复训练');
    recommendations.push('注意睡眠和营养补充');
  } else {
    recommendations.push('继续保持当前训练节奏');
    recommendations.push('按计划进行训练');
  }

  return recommendations;
}

function predictPerformance(ctl, tsb, daysToRace) {
  if (daysToRace <= 0) {
    return {
      readiness: 'race_day',
      recommendation: '今天就是比赛日，保持状态'
    };
  }

  const predictedTSB = tsb + (daysToRace * (ctl / 42));
  
  if (daysToRace <= 3) {
    return {
      readiness: 'taper',
      predictedTSB: Math.round(predictedTSB * 10) / 10,
      recommendation: '减量期，只做轻松活动'
    };
  } else if (daysToRace <= 7) {
    return {
      readiness: 'final_prep',
      predictedTSB: Math.round(predictedTSB * 10) / 10,
      recommendation: '最后一周，减少训练量但保持强度'
    };
  } else {
    return {
      readiness: 'training',
      predictedTSB: Math.round(predictedTSB * 10) / 10,
      recommendation: '继续按计划训练'
    };
  }
}

module.exports = {
  calculateSRPE,
  calculateEWMA,
  calculateATL,
  calculateCTL,
  calculateTSB,
  calculateTrainingLoad,
  interpretTSB,
  calculateTrainingMonotony,
  calculateTrainingStrain,
  assessRiskLevel,
  generateRecommendations,
  predictPerformance,
  LOAD_CONSTANTS
};
