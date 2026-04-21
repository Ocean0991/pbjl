const { addDays, formatDate, daysBetween } = require('./util');

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
