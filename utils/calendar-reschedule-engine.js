const { addDays, formatDate, daysBetween } = require('./util');

const RESCHEDULE_RULES = {
  MAX_CONSECUTIVE_MISSES: 2,
  MIN_DAYS_BETWEEN_QUALITY: 2,
  LONG_RUN_PRIORITY: 'highest',
  TAPER_PROTECTION_DAYS: 10,
  MAX_WEEKLY_INCREASE: 0.1
};

function reschedulePlan(plan, records, adjustments, currentDate) {
  if (!plan || !plan.weeks || plan.weeks.length === 0) {
    return plan;
  }

  const rescheduledPlan = JSON.parse(JSON.stringify(plan));
  const { tasksByDate } = rescheduledPlan;
  const today = currentDate || formatDate(new Date());

  const missedWorkouts = identifyMissedWorkouts(tasksByDate, records, today);
  const upcomingWorkouts = identifyUpcomingWorkouts(tasksByDate, today);

  if (missedWorkouts.length === 0) {
    return rescheduledPlan;
  }

  const rescheduleActions = generateRescheduleActions(
    missedWorkouts,
    upcomingWorkouts,
    records,
    today
  );

  applyRescheduleActions(rescheduledPlan, rescheduleActions);

  validateRescheduledPlan(rescheduledPlan, today);

  return rescheduledPlan;
}

function identifyMissedWorkouts(tasksByDate, records, today) {
  const missed = [];
  
  Object.keys(tasksByDate)
    .filter(date => date < today)
    .sort()
    .forEach(date => {
      const task = tasksByDate[date];
      const record = records[date];

      if (task && task.trackable) {
        if (!record || record.completion === 'missed') {
          missed.push({
            date,
            task,
            priority: getTaskPriority(task)
          });
        }
      }
    });

  return missed.sort((a, b) => b.priority - a.priority);
}

function identifyUpcomingWorkouts(tasksByDate, today) {
  const upcoming = [];
  
  Object.keys(tasksByDate)
    .filter(date => date >= today)
    .sort()
    .forEach(date => {
      const task = tasksByDate[date];
      if (task && task.trackable) {
        upcoming.push({
          date,
          task,
          available: true
        });
      }
    });

  return upcoming;
}

function getTaskPriority(task) {
  const priorityMap = {
    'long': 100,
    'quality': 80,
    'easy': 60,
    'recovery': 40,
    'strength': 30,
    'cross': 20,
    'mobility': 10,
    'rest': 0
  };

  return priorityMap[task.type] || 50;
}

function generateRescheduleActions(missedWorkouts, upcomingWorkouts, records, today) {
  const actions = [];

  missedWorkouts.forEach(missed => {
    if (missed.task.type === 'long') {
      const longRunAction = handleMissedLongRun(missed, upcomingWorkouts, records, today);
      if (longRunAction) {
        actions.push(longRunAction);
      }
    } else if (missed.task.type === 'quality') {
      const qualityAction = handleMissedQuality(missed, upcomingWorkouts, records, today);
      if (qualityAction) {
        actions.push(qualityAction);
      }
    } else {
      const easyAction = handleMissedEasy(missed, upcomingWorkouts, records, today);
      if (easyAction) {
        actions.push(easyAction);
      }
    }
  });

  return actions;
}

function handleMissedLongRun(missed, upcomingWorkouts, records, today) {
  const daysToRace = getDaysToRace(upcomingWorkouts);
  
  if (daysToRace <= RESCHEDULE_RULES.TAPER_PROTECTION_DAYS) {
    return {
      type: 'skip',
      reason: '比赛临近，不补长距离',
      originalDate: missed.date,
      taskType: 'long'
    };
  }

  const nextLongRun = upcomingWorkouts.find(w => w.task.type === 'long');
  
  if (nextLongRun) {
    return {
      type: 'skip',
      reason: '已有后续长距离安排，不补这次',
      originalDate: missed.date,
      taskType: 'long'
    };
  }

  const nextAvailableSlot = findNextAvailableSlot(upcomingWorkouts, 'long', today);
  
  if (nextAvailableSlot) {
    return {
      type: 'reschedule',
      reason: '将长距离调整到最近可用日期',
      originalDate: missed.date,
      newDate: nextAvailableSlot.date,
      taskType: 'long'
    };
  }

  return {
    type: 'skip',
    reason: '无可用日期，跳过这次长距离',
    originalDate: missed.date,
    taskType: 'long'
  };
}

function handleMissedQuality(missed, upcomingWorkouts, records, today) {
  const daysToRace = getDaysToRace(upcomingWorkouts);
  
  if (daysToRace <= RESCHEDULE_RULES.TAPER_PROTECTION_DAYS) {
    return {
      type: 'skip',
      reason: '比赛临近，不补质量课',
      originalDate: missed.date,
      taskType: 'quality'
    };
  }

  const recentQualityCount = countRecentQuality(upcomingWorkouts, 7);
  
  if (recentQualityCount >= 1) {
    return {
      type: 'skip',
      reason: '本周已有质量课，不补这次',
      originalDate: missed.date,
      taskType: 'quality'
    };
  }

  const nextAvailableSlot = findNextAvailableSlot(upcomingWorkouts, 'quality', today);
  
  if (nextAvailableSlot) {
    return {
      type: 'reschedule',
      reason: '将质量课调整到最近可用日期',
      originalDate: missed.date,
      newDate: nextAvailableSlot.date,
      taskType: 'quality'
    };
  }

  return {
    type: 'skip',
    reason: '无可用日期，跳过这次质量课',
    originalDate: missed.date,
    taskType: 'quality'
  };
}

function handleMissedEasy(missed, upcomingWorkouts, records, today) {
  return {
    type: 'skip',
    reason: '轻松跑不补，继续按计划推进',
    originalDate: missed.date,
    taskType: missed.task.type
  };
}

function findNextAvailableSlot(upcomingWorkouts, taskType, today) {
  const minDaysAfter = taskType === 'long' ? 3 : 2;
  const minDate = formatDate(addDays(new Date(today), minDaysAfter));

  return upcomingWorkouts.find(w => {
    if (w.date < minDate) return false;
    if (w.task.type === 'rest') return true;
    if (w.task.type === 'easy' && taskType === 'quality') return true;
    return false;
  });
}

function getDaysToRace(upcomingWorkouts) {
  const lastWorkout = upcomingWorkouts[upcomingWorkouts.length - 1];
  if (!lastWorkout || lastWorkout.task.type !== 'race') return 999;
  
  const today = formatDate(new Date());
  return daysBetween(today, lastWorkout.date);
}

function countRecentQuality(upcomingWorkouts, days) {
  const today = formatDate(new Date());
  const cutoffDate = formatDate(addDays(new Date(today), days));
  
  return upcomingWorkouts.filter(w => {
    return w.date <= cutoffDate && w.task.type === 'quality';
  }).length;
}

function applyRescheduleActions(plan, actions) {
  actions.forEach(action => {
    if (action.type === 'skip') {
      plan.tasksByDate[action.originalDate].status = 'skipped';
      plan.tasksByDate[action.originalDate].skipReason = action.reason;
    } else if (action.type === 'reschedule') {
      const originalTask = plan.tasksByDate[action.originalDate];
      plan.tasksByDate[action.newDate] = {
        ...originalTask,
        dateKey: action.newDate,
        status: 'rescheduled',
        originalDate: action.originalDate,
        rescheduleReason: action.reason
      };
      
      plan.tasksByDate[action.originalDate].status = 'moved';
      plan.tasksByDate[action.originalDate].movedTo = action.newDate;
    }
  });
}

function validateRescheduledPlan(plan, today) {
  const { tasksByDate } = plan;
  
  Object.keys(tasksByDate)
    .filter(date => date >= today)
    .sort()
    .forEach((date, index, dates) => {
      const task = tasksByDate[date];
      
      if (task.type === 'quality' && index > 0) {
        const prevDate = dates[index - 1];
        const prevTask = tasksByDate[prevDate];
        
        if (prevTask && prevTask.type === 'quality') {
          tasksByDate[date].type = 'easy';
          tasksByDate[date].title = '轻松跑';
          tasksByDate[date].target = '轻松跑替代质量课';
        }
      }
    });
}

function suggestPlanAdjustments(plan, records, currentDate) {
  const today = currentDate || formatDate(new Date());
  const loadEngine = require('./load-engine-v2');
  
  const loadData = loadEngine.calculateTrainingLoad(records, today);
  const riskAssessment = loadEngine.assessRiskLevel(loadData);

  const suggestions = [];

  if (riskAssessment.level === 'high') {
    suggestions.push({
      type: 'reduce_load',
      priority: 'high',
      reason: '训练负荷过高，建议减少本周训练量',
      action: '将本周质量课改为轻松跑'
    });
  }

  if (riskAssessment.level === 'medium') {
    suggestions.push({
      type: 'add_recovery',
      priority: 'medium',
      reason: '训练负荷偏高，建议增加恢复',
      action: '在质量课后增加恢复日'
    });
  }

  const consecutiveMisses = countConsecutiveMisses(records, today);
  if (consecutiveMisses >= RESCHEDULE_RULES.MAX_CONSECUTIVE_MISSES) {
    suggestions.push({
      type: 'rebuild_plan',
      priority: 'high',
      reason: '连续多次未完成训练，建议重组计划',
      action: '根据当前状态重新生成计划'
    });
  }

  return {
    riskLevel: riskAssessment.level,
    suggestions,
    loadData
  };
}

function countConsecutiveMisses(records, untilDate) {
  const dates = Object.keys(records)
    .filter(date => date <= untilDate)
    .sort()
    .reverse();

  let count = 0;
  for (const date of dates) {
    if (records[date].completion === 'missed') {
      count++;
    } else {
      break;
    }
  }

  return count;
}

module.exports = {
  reschedulePlan,
  identifyMissedWorkouts,
  identifyUpcomingWorkouts,
  generateRescheduleActions,
  applyRescheduleActions,
  validateRescheduledPlan,
  suggestPlanAdjustments,
  RESCHEDULE_RULES
};
