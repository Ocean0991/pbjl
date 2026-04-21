const { addDays, formatDate, daysBetween } = require('./util');

const RACE_DISTANCES = {
  '5k': 5,
  '10k': 10,
  'half_marathon': 21.1,const { addDays, formatDate, daysBetween } = require('./util');

// 新增：力量训练类型定义
const STRENGTH_TRAINING_TYPES = {
  bodyweight: ['深蹲', '俯卧撑', '平板支撑', '箭步蹲', '臀桥', '卷腹'],
  light_weights: ['哑铃弯举', '哑铃肩推', '哑铃硬拉', '哑铃划船', '哑铃卧推'],
  resistance_band: ['弹力带深蹲', '弹力带划船', '弹力带侧平举', '弹力带臂屈伸']
};

// 新增：语音指导配置
const VOICE_GUIDE_TYPES = {
  warm_up: '热身指导',
  run_form: '跑步姿势提示',
  pace_feedback: '配速反馈',
  recovery_tips: '恢复建议',
trength_guide: '力量训练指导'
};

// 新增：动态调整参数
const ADJUSTMENT_PARAMETERS = {
  performance_weight: 0.6,
  fatigue_weight: 0.3,
  preference_weight: 0.1,
  max_increase_per_week: 0.15,
  min_decrease_per_week: 0.05
};

const RACE_DISTANCES = {
  '5k': 5,
  '10k': 10,
  'half_marathon': 21.1,
  'full_marathon': 42.2
};

const PHASE_DURATIONS = {
  base: 0.4,
  build: 0.3,
  peak: 0.2,
  taper: 0.1
};

// 新增：训练强度系数
const INTENSITY_FACTORS = {
  easy: 0.6,
  moderate: 0.75,
  threshold: 0.85,
  interval: 0.95,
  race: 1.0
};

function generateTrainingPlan(profile) {
  if (!profile || !profile.raceDate) {
    return null;
  }

  const today = new Date();
  const raceDate = new Date(profile.raceDate);
  const daysToRace = daysBetween(today, raceDate);

  if (daysToRace < 7) {
    return null;
  }

  const totalWeeks = Math.floor(daysToRace / 7);
  consttartDate = formatDate(today);
  const endDate = formatDate(raceDate);

  // 新增：初始化训练计划版本和元数据
  const plan = {
    version: 2.0, // 升级版本号
    generatedAt: new Date().toISOString(),
tartDate,
    endDate,
    totalWeeks,
    currentWeek: 1,
    raceType: profile.raceType,
    goalType: profile.goalType,
    userProfile: {
      experienceLevel: profile.experienceLevel || 'beginner',
      weeklyMileage: profile.weeklyMileage || 10,
trengthTrainingFrequency: profile.trengthTrainingFrequency || 2,
      preferredStrengthType: profile.preferredStrengthType || 'bodyweight',
      hasVoiceGuide: profile.hasVoiceGuide || true,
      injuryHistory: profile.injuryHistory || []
    },
    weeks: [],
    tasksByDate: {},
    adjustmentHistory: [],
yncStatus: {
      lastSynced: null,
yncProvider: null
}
  };

  plan.weeks = generateWeeks(plan, totalWeeks, tartDate, raceDate);
  plan.tasksByDate = generateTasksByDate(plan.weeks, plan);

  return plan;
}

function generateWeeks(plan, totalWeeks, tartDate, raceDate) {
  const weeks = [];
  const raceDistance = RACE_DISTANCES[plan.raceType] || 21.1;
  const userProfile = plan.userProfile;

  for (let weekIndex = 1; weekIndex <= totalWeeks; weekIndex++) {
    const weekStartDate = addDays(new Date(tartDate), (weekIndex - 1) * 7);
    const weekEndDate = addDays(new Date(tartDate), weekIndex * 7 - 1);
    const phase = determinePhase(weekIndex, totalWeeks);
    const longRunDistance = calculateLongRunDistance(weekIndex, totalWeeks, raceDistance, plan);
    const weeklyMileage = calculateWeeklyMileage(weekIndex, totalWeeks, plan);
    consttrengthTrainingDays = calculateStrengthTrainingDays(weekIndex, phase, userProfile);

    const week = {
      weekIndex,
tartDate: formatDate(weekStartDate),
      endDate: formatDate(weekEndDate),
      phase,
      phaseLabel: getPhaseLabel(phase),
      weeklyMileage,
      longRunDistance,
trengthTrainingDays,
      recoveryDays: calculateRecoveryDays(phase, userProfile),
      adjustmentFactor: 1.0,
      notes: []
    };

    // 新增：根据用户历史表现调整周计划
    if (weekIndex > 1) {
      week.adjustmentFactor = calculateWeeklyAdjustment(plan, weekIndex);
      week.weeklyMileage *= week.adjustmentFactor;
      week.longRunDistance *= week.adjustmentFactor;
    }

    week.days = generateWeekDays(week, plan);
    weeks.push(week);
  }

  return weeks;
}

function determinePhase(weekIndex, totalWeeks) {
  const baseWeeks = Math.floor(totalWeeks * PHASE_DURATIONS.base);
  const buildWeeks = Math.floor(totalWeeks * PHASE_DURATIONS.build);
  const peakWeeks = Math.floor(totalWeeks * PHASE_DURATIONS.peak);

  if (weekIndex <= baseWeeks) {
    return 'base';
  } else if (weekIndex <= baseWeeks + buildWeeks) {
    return 'build';
  } else if (weekIndex <= baseWeeks + buildWeeks + peakWeeks) {
    return 'peak';
  } else {
    return 'taper';
  }
}

function getPhaseLabel(phase) {
  const labels = {
    base: '基础期',
    build: '提升期',
    peak: '巅峰期',
    taper: '调整期'
  };
  return labels[phase] || phase;
}

function calculateLongRunDistance(weekIndex, totalWeeks, raceDistance, plan) {
  const phase = determinePhase(weekIndex, totalWeeks);
  const userLevel = plan.userProfile.experienceLevel;
  const baseMultiplier = userLevel === 'beginner' ? 0.3 : userLevel === 'intermediate' ? 0.4 : 0.5;

witch (phase) {
  case 'base':
      return raceDistance * baseMultiplier * (weekIndex / (totalWeeks * PHASE_DURATIONS.base));
  case 'build':
      const baseWeeks = Math.floor(totalWeeks * PHASE_DURATIONS.base);
      const buildWeek = weekIndex - baseWeeks;
      const buildTotal = Math.floor(totalWeeks * PHASE_DURATIONS.build);
      return raceDistance * (baseMultiplier + (0.3 * (buildWeek / buildTotal)));
  case 'peak':
      return raceDistance * 0.8;
  case 'taper':
      const peakWeeks = Math.floor(totalWeeks * PHASE_DURATIONS.peak);
      const taperWeek = weekIndex - (totalWeeks - peakWeeks);
      const taperTotal = Math.floor(totalWeeks * PHASE_DURATIONS.taper);
      return raceDistance * (0.8 - (0.3 * (taperWeek / taperTotal)));
  default:
      return raceDistance * 0.5;
}
}

function calculateWeeklyMileage(weekIndex, totalWeeks, plan) {
  const phase = determinePhase(weekIndex, totalWeeks);
  const userBaseMileage = plan.userProfile.weeklyMileage;
  const raceDistance = RACE_DISTANCES[plan.raceType] || 21.1;
  const maxMileage = raceDistance * 2.5;

witch (phase) {
  case 'base':
      return Math.min(userBaseMileage * (1 + (weekIndex / (totalWeeks * PHASE_DURATIONS.base)) * 0.5), maxMileage * 0.6);
  case 'build':
      const baseWeeks = Math.floor(totalWeeks * PHASE_DURATIONS.base);
      const buildWeek = weekIndex - baseWeeks;
      const buildTotal = Math.floor(totalWeeks * PHASE_DURATIONS.build);
      return Math.min(userBaseMileage * 1.5 * (1 + (buildWeek / buildTotal) * 0.8), maxMileage * 0.85);
  case 'peak':
      return maxMileage * 0.95;
  case 'taper':
      const taperWeek = weekIndex - (totalWeeks - Math.floor(totalWeeks * PHASE_DURATIONS.taper));
      const taperTotal = Math.floor(totalWeeks * PHASE_DURATIONS.taper);
      return maxMileage * (0.95 - (0.4 * (taperWeek / taperTotal)));
  default:
      return userBaseMileage;
}
}

// 新增：计算力量训练天数
function calculateStrengthTrainingDays(weekIndex, phase, userProfile) {
  const baseDays = userProfile.trengthTrainingFrequency;
  
witch (phase) {
  case 'base':
      return baseDays;
  case 'build':
      return Math.min(baseDays + 1, 3);
  case 'peak':
      return Math.max(baseDays - 1, 1);
  case 'taper':
      return Math.max(baseDays - 1, 1);
  default:
      return baseDays;
}
}

// 新增：计算恢复天数
function calculateRecoveryDays(phase, userProfile) {
  const baseRecovery = userProfile.experienceLevel === 'beginner' ? 2 : 1;
  
witch (phase) {
  case 'base':
      return baseRecovery;
  case 'build':
      return baseRecovery;
  case 'peak':
      return baseRecovery + 1;
  case 'taper':
      return baseRecovery + 1;
  default:
      return baseRecovery;
}
}

// 新增：计算周调整系数
function calculateWeeklyAdjustment(plan, weekIndex) {onst lastWeek = plan.weeks[weekIndex - 2];
  if (!lastWeek || !lastWeek.performanceData) {
    return 1.0;
  }

  const performance = lastWeek.performanceData.avgPerformance || 1.0;
  const fatigue = lastWeek.performanceData.fatigueLevel || 0.5;
  const preference = lastWeek.performanceData.preferenceScore || 0.5;

  const adjustment = (
    performance * ADJUSTMENT_PARAMETERS.performance_weight +
    (1 - fatigue) * ADJUSTMENT_PARAMETERS.fatigue_weight +
    preference * ADJUSTMENT_PARAMETERS.preference_weight
  );

  // 限制调整幅度
  return Math.max(
    1 - ADJUSTMENT_PARAMETERS.min_decrease_per_week,
    Math.min(
      1 + ADJUSTMENT_PARAMETERS.max_increase_per_week,
      adjustment
    )
  );
                                                    }

function generateWeekDays(week, plan) {
  const days = [];
  const dailyMileage = week.weeklyMileage / (7 - week.recoveryDays);
  const raceDistance = RACE_DISTANCES[plan.raceType] || 21.1;
  const userProfile = plan.userProfile;

  // 安排长距离跑（通常在周末）
  const longRunDay = 6; // 周六
  
  // 安排力量训练
  consttrengthDays = [];
  consttrengthTrainingDays = week.trengthTrainingDays;
  for (let i = 0; i < trengthTrainingDays; i++) {
trengthDays.push(1 + i * 2); // 周一、周三等
  }

  // 安排恢复跑
  const recoveryDays = [];
  for (let i = 0; i < week.recoveryDays; i++) {
    recoveryDays.push(2 + i * 2); // 周二、周四等
  }

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = addDays(new Date(week.tartDate), dayIndex);
    const dayOfWeek = date.getDay();
    let tasks = [];

    if (dayIndex === longRunDay) {
      // 长距离跑日
      tasks.push(createLongRunTask(week.longRunDistance, week.phase, plan));
    } else if (trengthDays.includes(dayIndex)) {
      // 力量训练日
      tasks.push(createStrengthTrainingTask(week.phase, userProfile));
      // 加上轻松跑
      if (week.phase !== 'taper') {
        tasks.push(createEasyRunTask(dailyMileage * 0.6, plan));
      }
    } else if (recoveryDays.includes(dayIndex)) {
      // 恢复日
      tasks.push(createRecoveryTask(plan));
    } else {
      // 日常训练
      if (Math.random() > 0.5) {
        tasks.push(createEasyRunTask(dailyMileage, plan));
      } else {
        tasks.push(createQualityTask(dailyMileage, week.phase, raceDistance, plan));
      }
    }

    days.push({
      date: formatDate(date),
      dayOfWeek,
      tasks,
      notes: [],
      completed: false,
      performanceData: null
    });
  }

  return days;
}

function createLongRunTask(distance, phase, plan) {
  const paceRange = getPaceRange('long_run', phase, plan.userProfile.experienceLevel);
  const voiceGuides = [
    VOICE_GUIDE_TYPES.warm_up,
    VOICE_GUIDE_TYPES.pace_feedback,
    VOICE_GUIDE_TYPES.recovery_tips
  ];

  return {
    id: `long_run_${Date.now()}`,
    type: 'long_run',
    name: '长距离跑',
    distance: Math.round(distance * 10) / 10,
    duration: calculateDuration(distance, paceRange.avg),
    paceRange,
    intensity: 'moderate',
    voiceGuides: plan.userProfile.hasVoiceGuide ? voiceGuides : [],
    instructions: '保持稳定配速，注意补水和补给',
    targetHeartRate: getHeartRateZone('moderate', plan.userProfile)
  };
}

function createEasyRunTask(distance, plan) {
  const paceRange = getPaceRange('easy_run', 'base', plan.userProfile.experienceLevel);
  const voiceGuides = [
    VOICE_GUIDE_TYPES.run_form,
    VOICE_GUIDE_TYPES.pace_feedback
  ];

  return {
    id: `easy_run_${Date.now()}`,
    type: 'easy_run',
    name: '轻松跑',
    distance: Math.round(distance * 10) / 10,
    duration: calculateDuration(distance, paceRange.avg),
    paceRange,
    intensity: 'easy',
    voiceGuides: plan.userProfile.hasVoiceGuide ? voiceGuides : [],
    instructions: '保持轻松节奏，专注于跑步姿势',
    targetHeartRate: getHeartRateZone('easy', plan.userProfile)
  };
}

function createQualityTask(distance, phase, raceDistance, plan) {
  const taskTypes = ['threshold', 'interval', 'tempo'];
  constelectedType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
  const paceRange = getPaceRange(electedType, phase, plan.userProfile.experienceLevel);
  const voiceGuides = [
    VOICE_GUIDE_TYPES.warm_up,
    VOICE_GUIDE_TYPES.pace_feedback,
    VOICE_GUIDE_TYPES.run_form
  ];

  let taskConfig;
witch (electedType) {
  case 'threshold':
      taskConfig = {
        name: '乳酸门槛跑',
        distance: distance * 0.8,
        workRatio: 0.8,
        restRatio: 0.2
      };
      break;
  case 'interval':
      taskConfig = {
        name: '间歇跑',
        distance: distance * 0.7,
        workRatio: 0.4,
        restRatio: 0.6,
        intervals: 8
      };
      break;
  case 'tempo':
      taskConfig = {
        name: '节奏跑',
        distance: distance * 0.9,
        workRatio: 0.9,
        restRatio: 0.1
      };
      break;
  default:
      taskConfig = {
        name: '节奏跑',
        distance: distance * 0.9,
        workRatio: 0.9,
        restRatio: 0.1
      };
}

  return {
    id: `${electedType}_${Date.now()}`,
    type: electedType,
    name: taskConfig.name,
    distance: Math.round(taskConfig.distance * 10) / 10,
    duration: calculateDuration(taskConfig.distance, paceRange.avg),
    paceRange,
    intensity: 'threshold',
    voiceGuides: plan.userProfile.hasVoiceGuide ? voiceGuides : [],
    instructions: getQualityTaskInstructions(electedType),
    targetHeartRate: getHeartRateZone('threshold', plan.userProfile),
    intervals: taskConfig.intervals,
    workRatio: taskConfig.workRatio,
    restRatio: taskConfig.restRatio
  };
}

// 新增：创建力量训练任务
function createStrengthTrainingTask(phase, userProfile) {
  consttrengthType = userProfile.preferredStrengthType;
  const exercises = STRENGTH_TRAINING_TYPES[trengthType] || STRENGTH_TRAINING_TYPES.bodyweight;
  constelectedExercises = [];
  
  // 随机选择4-6个练习
  const exerciseCount = Math.floor(Math.random() * 3) + 4;
  for (let i = 0; i < exerciseCount; i++) {
    const randomIndex = Math.floor(Math.random() * exercises.length);
electedExercises.push(exercises[randomIndex]);
  }

  const voiceGuides = [
    VOICE_GUIDE_TYPES.trength_guide,
    VOICE_GUIDE_TYPES.recovery_tips
  ];

  return {
    id: `strength_${Date.now()}`,
    type: 'strength_training',
    name: '力量训练',
    duration: phase === 'peak' ? 45 : 30,
    exercises: electedExercises,
    intensity: phase === 'build' || phase === 'peak' ? 'moderate' : 'easy',
    voiceGuides: userProfile.hasVoiceGuide ? voiceGuides : [],
    instructions: '每个练习3组，每组8-12次，组间休息60秒',
    equipment: trengthType === 'bodyweight' ? '无' : trengthType === 'light_weights' ? '哑铃' : '弹力带'
  };
}

function createRecoveryTask(plan) {
  const recoveryActivities = ['瑜伽', '游泳', '散步', '泡沫轴放松'];
  constelectedActivity = recoveryActivities[Math.floor(Math.random() * recoveryActivities.length)];

  return {
    id: `recovery_${Date.now()}`,
    type: 'recovery',
    name: '恢复活动',
    duration: 30,
    activity: electedActivity,
    intensity: 'easy',
    voiceGuides: plan.userProfile.hasVoiceGuide ? [VOICE_GUIDE_TYPES.recovery_tips] : [],
    instructions: '专注于放松和恢复，避免高强度运动'
  };
}

function getPaceRange(taskType, phase, userLevel) {
  const basePace = userLevel === 'beginner' ? 6 : userLevel === 'intermediate' ? 5 : 4.5;
  const intensityFactor = {
    easy_run: 0.9,
    long_run: 0.85,
    threshold: 0.7,
    interval: 0.6,
    tempo: 0.75
  }[taskType] || 0.85;

  const phaseFactor = {
    base: 1.0,
    build: 0.95,
    peak: 0.9,
    taper: 1.05
  }[phase] || 1.0;

  const avgPace = basePace * intensityFactor * phaseFactor;
  return {
    min: avgPace * 1.1,
    avg: avgPace,
    max: avgPace * 0.9
  };
}

function calculateDuration(distance, pacePerKm) {
  return Math.round(distance * pacePerKm * 60); // 转换为秒
}

function getQualityTaskInstructions(taskType) {
  const instructions = {
    threshold: '保持稳定的乳酸门槛配速，持续跑完全程',
    interval: '高强度间歇跑，快跑后充分休息，重复完成',
    tempo: '保持舒适但有挑战的节奏，持续跑步'
  };
  return instructions[taskType] || '按照计划完成质量训练';
}

// 新增：获取心率区间
function getHeartRateZone(intensity, userProfile) {
  const maxHeartRate = 220 - (userProfile.age || 30);
  const zones = {
    easy: { min: maxHeartRate * 0.6, max: maxHeartRate * 0.7 },
    moderate: { min: maxHeartRate * 0.7, max: maxHeartRate * 0.8 },
    threshold: { min: maxHeartRate * 0.8, max: maxHeartRate * 0.9 },
    max: { min: maxHeartRate * 0.9, max: maxHeartRate * 1.0 }
  };
  return zones[intensity] || zones.moderate;
}

function generateTasksByDate(weeks, plan) {
  const tasksByDate = {};

  weeks.forEach(week => {
    week.days.forEach(day => {
      tasksByDate[day.date] = {
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        tasks: day.tasks.map(task => ({
          ...task,
          voiceGuideEnabled: plan.userProfile.hasVoiceGuide,
yncStatus: 'pending'
        })),
        notes: day.notes,
        completed: day.completed,
        performanceData: day.performanceData,
        adjustmentSuggestion: null
      };
    });
  });

  return tasksByDate;
}

// 新增：动态调整训练计划
function adjustTrainingPlan(plan, performanceData) {
  const adjustedPlan = JSON.parse(JSON.tringify(plan));
  
  // 记录表现数据
  adjustedPlan.adjustmentHistory.push({
    date: new Date().toISOString(),
    performanceData,
    adjustmentType: 'performance_based'
  });

  // 调整当前周的训练
  const currentWeek = adjustedPlan.weeks[adjustedPlan.currentWeek - 1];
  if (currentWeek) {
    const adjustmentFactor = calculatePerformanceAdjustment(performanceData);
    currentWeek.adjustmentFactor = adjustmentFactor;
    
    // 调整本周的训练任务
    currentWeek.days.forEach(day => {
      day.tasks.forEach(task => {
        if (task.type.includes('run')) {
          task.distance *= adjustmentFactor;
          task.duration *= adjustmentFactor;
        }
      });
    });
  }

  return adjustedPlan;
}

// 新增：计算表现调整系数
function calculatePerformanceAdjustment(performanceData) {
  const avgPace = performanceData.avgPace || 1.0;
  const perceivedEffort = performanceData.perceivedEffort || 5;
  const completionRate = performanceData.completionRate || 1.0;

  const paceAdjustment = avgPace < 0.8 ? 1.1 : avgPace > 1.2 ? 0.9 : 1.0;
  const effortAdjustment = perceivedEffort < 3 ? 1.05 : perceivedEffort > 7 ? 0.95 : 1.0;
  const completionAdjustment = completionRate > 0.9 ? 1.05 : completionRate < 0.7 ? 0.9 : 1.0;

  return paceAdjustment * effortAdjustment * completionAdjustment;
}

// 新增：数据同步函数
functionyncTrainingData(plan, yncProvider, data) {
  constyncedPlan = JSON.parse(JSON.tringify(plan));
  
yncedPlan.yncStatus = {
    lastSynced: new Date().toISOString(),
yncProvider,
yncVersion: '1.0'
};

  // 合并同步的数据
  if (data.performanceData) {
yncedPlan.adjustmentHistory.push({
      date: new Date().toISOString(),
      performanceData: data.performanceData,
      adjustmentType: 'synced'
});
  }

  if (data.completedTasks) {
    Object.keys(data.completedTasks).forEach(date => {
      if (yncedPlan.tasksByDate[date]) {
yncedPlan.tasksByDate[date].completed = true;
yncedPlan.tasksByDate[date].performanceData = data.completedTasks[date].performanceData;
      }
    });
  }

  returnyncedPlan;
}

// 新增：导出训练计划为PDF
function exportPlanToPDF(plan) {
  // 生成PDF内容的逻辑
  const pdfContent = {
    title: `${plan.userProfile.experienceLevel}级${plan.raceType}训练计划`,
tartDate: plan.tartDate,
    endDate: plan.endDate,
    totalWeeks: plan.totalWeeks,
    weeks: plan.weeks.map(week => ({
      weekIndex: week.weekIndex,
      phase: week.phaseLabel,
      weeklyMileage: week.weeklyMileage,
      longRunDistance: week.longRunDistance
    }))
  };

  return {
uccess: true,
    pdfContent,
    exportDate: new Date().toISOString()
  };
}

module.exports = {
  generateTrainingPlan,
  adjustTrainingPlan,
yncTrainingData,
  exportPlanToPDF,
  calculateLongRunDistance,
  calculateWeeklyMileage
};























































































































































































































































































































































































  c


































































































































































































































  'full_marathon': 42.2
};

const PHASE_DURATIONS = {
  base: 0.4,
  build: 0.3,
  peak: 0.2,
  taper: 0.1
};

function generateTrainingPlan(profile) {
  if (!profile || !profile.raceDate) {
    return null;
  }

  const today = new Date();
  const raceDate = new Date(profile.raceDate);
  const daysToRace = daysBetween(today, raceDate);

  if (daysToRace < 7) {
    return null;
  }

  const totalWeeks = Math.floor(daysToRace / 7);
  const startDate = formatDate(today);
  const endDate = formatDate(raceDate);

  const weeks = generateWeeks(profile, totalWeeks, startDate, raceDate);
  const tasksByDate = generateTasksByDate(weeks, profile);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    totalWeeks,
    currentWeek: 1,
    raceType: profile.raceType,
    goalType: profile.goalType,
    weeks,
    tasksByDate
  };
}

function generateWeeks(profile, totalWeeks, startDate, raceDate) {
  const weeks = [];
  const raceDistance = RACE_DISTANCES[profile.raceType] || 21.1;

  for (let weekIndex = 1; weekIndex <= totalWeeks; weekIndex++) {
    const weekStartDate = addDays(new Date(startDate), (weekIndex - 1) * 7);
    const weekEndDate = addDays(new Date(startDate), weekIndex * 7 - 1);
    
    const phase = determinePhase(weekIndex, totalWeeks);
    const longRunDistance = calculateLongRunDistance(weekIndex, totalWeeks, raceDistance, profile);
    const weeklyMileage = calculateWeeklyMileage(weekIndex, totalWeeks, profile);

    const days = generateWeekDays(weekStartDate, weekEndDate, profile, {
      weekIndex,
      phase,
      longRunDistance,
      weeklyMileage
    });

    weeks.push({
      index: weekIndex,
      startDate: formatDate(weekStartDate),
      endDate: formatDate(weekEndDate),
      phase: getPhaseLabel(phase),
      longRunTarget: longRunDistance,
      totalDistance: weeklyMileage,
      days
    });
  }

  return weeks;
}

function determinePhase(weekIndex, totalWeeks) {
  const progress = weekIndex / totalWeeks;

  if (progress <= PHASE_DURATIONS.base) {
    return 'base';
  } else if (progress <= PHASE_DURATIONS.base + PHASE_DURATIONS.build) {
    return 'build';
  } else if (progress <= PHASE_DURATIONS.base + PHASE_DURATIONS.build + PHASE_DURATIONS.peak) {
    return 'peak';
  } else {
    return 'taper';
  }
}

function getPhaseLabel(phase) {
  const labels = {
    base: '基础期',
    build: '提升期',
    peak: '巅峰期',
    taper: '减量期'
  };
  return labels[phase] || '基础期';
}

function calculateLongRunDistance(weekIndex, totalWeeks, raceDistance, profile) {
  const progress = weekIndex / totalWeeks;
  const maxLongRun = raceDistance * 0.8;
  const minLongRun = Math.min(profile.longestRunKm || 5, maxLongRun * 0.5);

  if (progress <= 0.7) {
    return Math.round((minLongRun + (maxLongRun - minLongRun) * (progress / 0.7)) * 10) / 10;
  } else {
    return Math.round(maxLongRun * (1 - (progress - 0.7) / 0.3 * 0.3) * 10) / 10;
  }
}

function calculateWeeklyMileage(weekIndex, totalWeeks, profile) {
  const baseMileage = profile.recentWeeklyMileage || 10;
  const targetMileage = baseMileage * 1.5;
  const progress = weekIndex / totalWeeks;

  if (progress <= 0.7) {
    return Math.round((baseMileage + (targetMileage - baseMileage) * (progress / 0.7)) * 10) / 10;
  } else {
    return Math.round(targetMileage * (1 - (progress - 0.7) / 0.3 * 0.4) * 10) / 10;
  }
}

function generateWeekDays(startDate, endDate, profile, weekConfig) {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const trainingDays = profile.preferredTrainingDays || [1, 3, 5];
  const trainingDaysPerWeek = profile.trainingDaysPerWeek || 3;

  let currentDate = start;
  let trainingDayCount = 0;
  let longRunDay = trainingDays[trainingDays.length - 1];

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dateKey = formatDate(currentDate);
    const isTrainingDay = trainingDays.includes(dayOfWeek);
    const isLongRunDay = dayOfWeek === longRunDay && trainingDayCount < trainingDaysPerWeek;

    let task = null;

    if (isLongRunDay && weekConfig.phase !== 'taper') {
      task = createLongRunTask(dateKey, weekConfig.longRunDistance, weekConfig.phase);
      trainingDayCount++;
    } else if (isTrainingDay && trainingDayCount < trainingDaysPerWeek) {
      task = createTrainingTask(dateKey, weekConfig.phase, trainingDayCount, weekConfig.weeklyMileage);
      trainingDayCount++;
    } else {
      task = createRestTask(dateKey);
    }

    days.push(task);
    currentDate = addDays(currentDate, 1);
  }

  return days;
}

function createLongRunTask(dateKey, distance, phase) {
  return {
    dateKey,
    type: 'long',
    title: '长距离跑',
    target: `${distance}公里`,
    purpose: '提高有氧耐力，适应长时间运动',
    distance,
    duration: Math.round(distance * 6),
    trackable: true,
    paceTarget: '轻松跑配速',
    heartRateTarget: '65-75%最大心率',
    reminder: '注意补水，保持均匀配速',
    avoid: '避免前半程跑太快'
  };
}

function createTrainingTask(dateKey, phase, taskIndex, weeklyMileage) {
  const taskTypes = ['easy', 'quality', 'recovery'];
  const type = taskTypes[taskIndex % taskTypes.length];
  const easyDistance = Math.max(3, Math.round(weeklyMileage * 0.3));

  const tasks = {
    easy: {
      type: 'easy',
      title: '轻松跑',
      target: `${easyDistance}公里`,
      purpose: '促进恢复，维持基础跑量',
      distance: easyDistance,
      duration: Math.round(easyDistance * 6),
      trackable: true,
      paceTarget: '轻松跑配速',
      heartRateTarget: '65-75%最大心率',
      reminder: '保持轻松，能说话的节奏',
      avoid: '避免跑太快'
    },
    quality: {
      type: 'quality',
      title: '质量课',
      target: phase === 'build' ? '节奏跑 20分钟' : '间歇跑 5x1000米',
      purpose: '提高乳酸阈值，增强速度能力',
      distance: 8,
      duration: 50,
      trackable: true,
      paceTarget: phase === 'build' ? '节奏跑配速' : '间歇跑配速',
      heartRateTarget: '85-90%最大心率',
      reminder: '充分热身，注意配速控制',
      avoid: '避免过度疲劳'
    },
    recovery: {
      type: 'recovery',
      title: '恢复跑',
      target: '5公里',
      purpose: '促进恢复，放松身心',
      distance: 5,
      duration: 30,
      trackable: true,
      paceTarget: '恢复跑配速',
      heartRateTarget: '60-70%最大心率',
      reminder: '保持轻松，不要用力',
      avoid: '避免任何强度'
    }
  };

  return {
    dateKey,
    ...tasks[type]
  };
}

function createRestTask(dateKey) {
  return {
    dateKey,
    type: 'rest',
    title: '休息日',
    target: '休息',
    purpose: '身体恢复，避免过度训练',
    distance: 0,
    duration: 0,
    trackable: false
  };
}

function generateTasksByDate(weeks, profile) {
  const tasksByDate = {};

  weeks.forEach(week => {
    week.days.forEach(day => {
      if (day) {
        tasksByDate[day.dateKey] = {
          ...day,
          weekIndex: week.index,
          phase: week.phase
        };
      }
    });
  });

  return tasksByDate;
}

function getTaskForDate(plan, date) {
  if (!plan || !plan.tasksByDate) {
    return null;
  }
  return plan.tasksByDate[date] || null;
}

function getCurrentWeek(plan, date) {
  if (!plan || !plan.weeks) {
    return null;
  }

  return plan.weeks.find(week => {
    return date >= week.startDate && date <= week.endDate;
  });
}

function summarizeWeek(plan, records, date) {
  const week = getCurrentWeek(plan, date);
  if (!week) {
    return {
      completedCount: 0,
      plannedCount: 0,
      completionRate: 0,
      longRunDone: false
    };
  }

  let completedCount = 0;
  let plannedCount = 0;
  let longRunDone = false;

  week.days.forEach(day => {
    if (day.trackable) {
      plannedCount++;
      const record = records ? records[day.dateKey] : null;
      if (record && record.completion !== 'missed') {
        completedCount++;
        if (day.type === 'long') {
          longRunDone = true;
        }
      }
    }
  });

  return {
    completedCount,
    plannedCount,
    completionRate: plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0,
    longRunDone
  };
}

module.exports = {
  generateTrainingPlan,
  getTaskForDate,
  getCurrentWeek,
  summarizeWeek,
  RACE_DISTANCES,
  PHASE_DURATIONS
};
