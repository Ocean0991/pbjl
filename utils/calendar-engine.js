const { addDays, daysBetween, formatDateLabel, getDayKey, getTodayKey, toDate, WEEKDAYS } = require('./date');

function getWeekStart(dateKey) {
  const date = toDate(dateKey);
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(date);
  start.setDate(start.getDate() - diff);
  return getDayKey(start);
}

function getWeekEnd(dateKey) {
  const start = getWeekStart(dateKey);
  return getDayKey(addDays(start, 6));
}

function getMonthStart(dateKey) {
  const date = toDate(dateKey);
  return getDayKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getMonthEnd(dateKey) {
  const date = toDate(dateKey);
  return getDayKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function buildWeekView(plan, records, referenceDateKey) {
  const refKey = referenceDateKey || getTodayKey();
  const weekStart = getWeekStart(refKey);
  const weekEnd = getWeekEnd(refKey);
  const days = [];

  for (let index = 0; index < 7; index += 1) {
    const dateKey = getDayKey(addDays(weekStart, index));
    const date = toDate(dateKey);
    const task = plan && plan.tasksByDate ? plan.tasksByDate[dateKey] : null;
    const record = records && records[dateKey] ? records[dateKey] : null;
    const isToday = dateKey === getTodayKey();

    days.push({
      dateKey,
      dayOfWeek: date.getDay(),
      dayLabel: WEEKDAYS[date.getDay()],
      dateNumber: date.getDate(),
      isToday,
      isPast: dateKey < getTodayKey(),
      isFuture: dateKey > getTodayKey(),
      task: task ? buildCalendarTask(task, record) : null,
      record: record || null
    });
  }

  return {
    type: 'week',
    referenceDate: refKey,
    startDate: weekStart,
    endDate: weekEnd,
    days
  };
}

function buildMonthView(plan, records, referenceDateKey) {
  const refKey = referenceDateKey || getTodayKey();
  const monthStart = getMonthStart(refKey);
  const monthEnd = getMonthEnd(refKey);
  const calStart = getWeekStart(monthStart);
  const calEnd = getWeekEnd(monthEnd);
  const weeks = [];
  let currentWeekStart = calStart;

  while (currentWeekStart <= calEnd) {
    const weekDays = [];

    for (let index = 0; index < 7; index += 1) {
      const dateKey = getDayKey(addDays(currentWeekStart, index));
      const date = toDate(dateKey);
      const task = plan && plan.tasksByDate ? plan.tasksByDate[dateKey] : null;
      const record = records && records[dateKey] ? records[dateKey] : null;
      const isToday = dateKey === getTodayKey();
      const inMonth = dateKey >= monthStart && dateKey <= monthEnd;

      weekDays.push({
        dateKey,
        dayOfWeek: date.getDay(),
        dayLabel: WEEKDAYS[date.getDay()],
        dateNumber: date.getDate(),
        isToday,
        inMonth,
        isPast: dateKey < getTodayKey(),
        isFuture: dateKey > getTodayKey(),
        task: task ? buildCalendarTask(task, record) : null,
        record: record || null
      });
    }

    weeks.push({
      startDate: currentWeekStart,
      endDate: getWeekEnd(currentWeekStart),
      days: weekDays
    });

    currentWeekStart = getDayKey(addDays(currentWeekStart, 7));
  }

  return {
    type: 'month',
    referenceDate: refKey,
    monthStart,
    monthEnd,
    calStart,
    calEnd,
    weeks
  };
}

function buildCalendarTask(task, record) {
  const typeColors = {
    easy: 'easy',
    long: 'long',
    quality: 'quality',
    recovery: 'recovery',
    strength: 'strength',
    cross: 'cross',
    mobility: 'mobility',
    rest: 'rest',
    race: 'race'
  };

  const statusIcons = {
    planned: '',
    done: '✓',
    partial: '◐',
    missed: '✗',
    moved: '→'
  };

  let status = 'planned';
  if (record) {
    if (record.completion === 'full') status = 'done';
    else if (record.completion === 'partial') status = 'partial';
    else if (record.completion === 'missed') status = 'missed';
  }

  if (task.moved_from_date_key) {
    status = 'moved';
  }

  return {
    id: task.id,
    dateKey: task.dateKey,
    type: task.type,
    typeColor: typeColors[task.type] || 'rest',
    title: task.title,
    target: task.target,
    isKeyWorkout: isKeyTask(task),
    status,
    statusIcon: statusIcons[status] || '',
    priority: task.priority || 'normal'
  };
}

function isRestTask(task) {
  return !task || task.type === 'rest';
}

function isRaceTask(task) {
  return Boolean(task && task.type === 'race');
}

function isKeyTask(task) {
  return Boolean(task && (task.priority === 'anchor' || task.type === 'long' || task.type === 'quality'));
}

function isHardTask(task) {
  return Boolean(task && (task.type === 'long' || task.type === 'quality'));
}

function isYieldTask(task) {
  return Boolean(task && ['easy', 'recovery', 'mobility', 'strength', 'cross'].includes(task.type));
}

function createMovedTask(task, targetDateKey, sourceDateKey, extra) {
  return Object.assign({}, task, {
    dateKey: targetDateKey,
    moved_from_date_key: sourceDateKey,
    id: `${targetDateKey}-${task.type}`
  }, extra || {});
}

function hasAdjacentHardTask(tasksByDate, dateKey, ignoredDates) {
  const ignore = Array.isArray(ignoredDates) ? ignoredDates : [];

  return [-1, 1].some(function(offset) {
    const neighborDateKey = getDayKey(addDays(dateKey, offset));
    if (ignore.indexOf(neighborDateKey) >= 0) {
      return false;
    }

    return isHardTask(tasksByDate[neighborDateKey]);
  });
}

function canPlaceTask(tasksByDate, dateKey, task, ignoredDates) {
  if (!isHardTask(task)) {
    return true;
  }

  return !hasAdjacentHardTask(tasksByDate, dateKey, ignoredDates);
}

function createEmptyChanges() {
  return {
    skipped: [],
    moved: [],
    rescheduled: [],
    preserved: [],
    demoted: [],
    deleted: []
  };
}

function buildRestTask(dateKey, weekIndex) {
  return {
    id: `${dateKey}-rest`,
    dateKey,
    weekIndex: weekIndex || 1,
    type: 'rest',
    title: '休息',
    target: '休息或轻松散步 20 分钟',
    purpose: '恢复本来就是训练的一部分。',
    priority: 'normal',
    trackable: false
  };
}

function moveTask(plan, records, fromDateKey, toDateKey, options) {
  const moveOptions = options || {};
  const tasksByDate = plan && plan.tasksByDate ? Object.assign({}, plan.tasksByDate) : {};
  const sourceTask = tasksByDate[fromDateKey];
  const targetTask = tasksByDate[toDateKey];
  const changes = createEmptyChanges();
  const windowDays = Number.isFinite(Number(moveOptions.windowDays)) ? Number(moveOptions.windowDays) : 7;

  if (!sourceTask) {
    return {
      success: false,
      reason: '源日期没有训练任务'
    };
  }

  if (isRaceTask(sourceTask) || isRestTask(sourceTask)) {
    return {
      success: false,
      reason: '这节训练不能改期'
    };
  }

  if (fromDateKey === toDateKey) {
    return {
      success: false,
      reason: '目标日期与源日期相同'
    };
  }

  if (!canPlaceTask(tasksByDate, toDateKey, sourceTask, [fromDateKey, toDateKey])) {
    return {
      success: false,
      reason: '这个日期附近已经有关键训练，先换到更空的一天更稳妥'
    };
  }

  if (targetTask && isKeyTask(sourceTask) && isKeyTask(targetTask)) {
    return {
      success: false,
      reason: '两个关键训练不建议直接对调，先改到休息日或轻松日更稳妥'
    };
  }

  const movedTask = createMovedTask(sourceTask, toDateKey, fromDateKey);
  changes.moved.push({
    task: movedTask,
    from: fromDateKey,
    to: toDateKey,
    reason: '按你的操作改到了新日期。'
  });

  if (!targetTask || isRestTask(targetTask)) {
    tasksByDate[fromDateKey] = buildRestTask(fromDateKey, sourceTask.weekIndex);
  } else if (isKeyTask(targetTask)) {
    if (!canPlaceTask(tasksByDate, fromDateKey, targetTask, [fromDateKey, toDateKey])) {
      return {
        success: false,
        reason: '原日期附近也已经有关键训练，先换到更空的一天更稳妥'
      };
    }

    const preservedTask = createMovedTask(targetTask, fromDateKey, toDateKey, {
      priority: targetTask.priority || 'anchor'
    });
    tasksByDate[fromDateKey] = preservedTask;
    changes.preserved.push({
      task: preservedTask,
      from: toDateKey,
      to: fromDateKey,
      reason: '关键训练优先保留，所以先挪回原空档。'
    });
  } else {
    const daysToRace = plan && plan.raceDate ? daysBetween(toDateKey, plan.raceDate) : 999;

    if (daysToRace < 14) {
      tasksByDate[fromDateKey] = buildRestTask(fromDateKey, sourceTask.weekIndex);
      changes.deleted.push({
        task: Object.assign({}, targetTask),
        dateKey: toDateKey,
        reason: '比赛前两周优先删掉非关键训练，避免后面越调越满。'
      });
    } else {
      const demotedTask = createMovedTask(targetTask, fromDateKey, toDateKey, {
        priority: 'demoted'
      });
      tasksByDate[fromDateKey] = demotedTask;
      changes.demoted.push({
        task: demotedTask,
        from: toDateKey,
        to: fromDateKey,
        reason: '这节非关键训练先给你手动调整的训练让位。'
      });
    }
  }

  tasksByDate[toDateKey] = movedTask;

  return {
    success: true,
    changes,
    tasksByDate,
    windowDays,
    explanation: buildMoveExplanation(changes)
  };
}

function findSkipRescheduleCandidate(tasksByDate, fromDateKey, task, windowDays) {
  const candidates = [];

  for (let offset = 1; offset <= windowDays; offset += 1) {
    const candidateDateKey = getDayKey(addDays(fromDateKey, offset));
    const candidateTask = tasksByDate[candidateDateKey];

    if (!candidateTask || isRaceTask(candidateTask) || isKeyTask(candidateTask)) {
      continue;
    }

    if (!canPlaceTask(tasksByDate, candidateDateKey, task, [fromDateKey, candidateDateKey])) {
      continue;
    }

    candidates.push({
      dateKey: candidateDateKey,
      task: candidateTask,
      score: isRestTask(candidateTask) ? 0 : isYieldTask(candidateTask) ? 1 : 2
    });
  }

  candidates.sort(function(left, right) {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    return left.dateKey.localeCompare(right.dateKey);
  });

  return candidates[0] || null;
}

function skipTask(plan, records, dateKey, options) {
  const skipOptions = options || {};
  const tasksByDate = plan && plan.tasksByDate ? Object.assign({}, plan.tasksByDate) : {};
  const task = tasksByDate[dateKey];
  const changes = createEmptyChanges();
  const windowDays = Number.isFinite(Number(skipOptions.windowDays)) ? Number(skipOptions.windowDays) : 7;

  if (!task) {
    return {
      success: false,
      reason: '该日期没有训练任务'
    };
  }

  if (isRaceTask(task) || isRestTask(task)) {
    return {
      success: false,
      reason: '这节训练不能跳过'
    };
  }

  changes.skipped.push({
    task: Object.assign({}, task),
    dateKey,
    reason: '按你的选择先把这节训练记为跳过。'
  });
  tasksByDate[dateKey] = buildRestTask(dateKey, task.weekIndex);

  if (isKeyTask(task)) {
    const candidate = findSkipRescheduleCandidate(tasksByDate, dateKey, task, windowDays);

    if (candidate) {
      const rescheduledTask = createMovedTask(task, candidate.dateKey, dateKey);
      tasksByDate[candidate.dateKey] = rescheduledTask;
      changes.rescheduled.push({
        task: rescheduledTask,
        from: dateKey,
        to: candidate.dateKey,
        reason: isRestTask(candidate.task)
          ? '关键训练优先顺延到最近的恢复日。'
          : '关键训练优先保留，所以让低优先级训练先让位。'
      });

      if (!isRestTask(candidate.task)) {
        changes.deleted.push({
          task: Object.assign({}, candidate.task),
          dateKey: candidate.dateKey,
          reason: '为了保住关键训练，这节非关键训练先被移除了。'
        });
      }
    }
  }

  return {
    success: true,
    changes,
    tasksByDate,
    windowDays,
    explanation: buildSkipExplanation(changes, task, windowDays)
  };
}

function buildMoveExplanation(changes) {
  const parts = [];

  changes.moved.forEach(function(item) {
    parts.push(`「${item.task.title}」从 ${item.from} 调到了 ${item.to}`);
  });

  changes.preserved.forEach(function(item) {
    parts.push(`「${item.task.title}」被保留在 ${item.to}，因为关键训练优先保住`);
  });

  changes.demoted.forEach(function(item) {
    parts.push(`「${item.task.title}」改到了 ${item.to}，因为它先给主训练让位`);
  });

  changes.deleted.forEach(function(item) {
    parts.push(`「${item.task.title}」被删掉了，因为 ${item.reason}`);
  });

  return parts.join('。');
}

function buildSkipExplanation(changes, originalTask, windowDays) {
  const parts = [`「${originalTask.title}」已按跳过处理`];

  changes.rescheduled.forEach(function(item) {
    parts.push(`关键训练已顺延到 ${item.to}`);
  });

  if (isKeyTask(originalTask) && !changes.rescheduled.length) {
    parts.push(`未来 ${windowDays} 天里没找到安全空档，所以先不自动顺延`);
  }

  changes.deleted.forEach(function(item) {
    parts.push(`「${item.task.title}」被移除了，因为 ${item.reason}`);
  });

  return parts.join('。');
}

function buildChangeSections(changes) {
  const sections = [];

  if (changes.skipped.length) {
    sections.push({
      key: 'skipped',
      title: '已跳过',
      items: changes.skipped.map(function(item) {
        return {
          id: `skipped-${item.dateKey}-${item.task.type}`,
          title: item.task.title,
          meta: formatDateLabel(item.dateKey),
          reason: item.reason
        };
      })
    });
  }

  if (changes.moved.length) {
    sections.push({
      key: 'moved',
      title: '已移动',
      items: changes.moved.map(function(item) {
        return {
          id: `moved-${item.from}-${item.to}-${item.task.type}`,
          title: item.task.title,
          meta: `${formatDateLabel(item.from)} -> ${formatDateLabel(item.to)}`,
          reason: item.reason
        };
      })
    });
  }

  if (changes.rescheduled.length) {
    sections.push({
      key: 'rescheduled',
      title: '自动顺延',
      items: changes.rescheduled.map(function(item) {
        return {
          id: `rescheduled-${item.from}-${item.to}-${item.task.type}`,
          title: item.task.title,
          meta: `${formatDateLabel(item.from)} -> ${formatDateLabel(item.to)}`,
          reason: item.reason
        };
      })
    });
  }

  if (changes.preserved.length) {
    sections.push({
      key: 'preserved',
      title: '保住的关键训练',
      items: changes.preserved.map(function(item) {
        return {
          id: `preserved-${item.from}-${item.to}-${item.task.type}`,
          title: item.task.title,
          meta: `${formatDateLabel(item.from)} -> ${formatDateLabel(item.to)}`,
          reason: item.reason
        };
      })
    });
  }

  if (changes.demoted.length) {
    sections.push({
      key: 'demoted',
      title: '已降级',
      items: changes.demoted.map(function(item) {
        return {
          id: `demoted-${item.from}-${item.to}-${item.task.type}`,
          title: item.task.title,
          meta: `${formatDateLabel(item.from)} -> ${formatDateLabel(item.to)}`,
          reason: item.reason
        };
      })
    });
  }

  if (changes.deleted.length) {
    sections.push({
      key: 'deleted',
      title: '已删除',
      items: changes.deleted.map(function(item) {
        return {
          id: `deleted-${item.dateKey}-${item.task.type}`,
          title: item.task.title,
          meta: formatDateLabel(item.dateKey),
          reason: item.reason
        };
      })
    });
  }

  return sections;
}

function buildSummaryCountText(changes) {
  const parts = [];

  if (changes.skipped.length) {
    parts.push(`跳过 ${changes.skipped.length} 项`);
  }
  if (changes.moved.length) {
    parts.push(`移动 ${changes.moved.length} 项`);
  }
  if (changes.rescheduled.length) {
    parts.push(`顺延 ${changes.rescheduled.length} 项`);
  }
  if (changes.preserved.length) {
    parts.push(`保留 ${changes.preserved.length} 项`);
  }
  if (changes.demoted.length) {
    parts.push(`降级 ${changes.demoted.length} 项`);
  }
  if (changes.deleted.length) {
    parts.push(`删除 ${changes.deleted.length} 项`);
  }

  return parts.join(' · ');
}

function buildCalendarAdjustment(action, result, context) {
  if (!result || !result.success) {
    return null;
  }

  const adjustmentContext = context || {};
  const sourceTask = adjustmentContext.sourceTask || null;
  const sourceDateKey = adjustmentContext.sourceDateKey || '';
  const targetDateKey = adjustmentContext.targetDateKey || '';
  const sections = buildChangeSections(result.changes || createEmptyChanges());
  const summaryCountText = buildSummaryCountText(result.changes || createEmptyChanges());
  const title =
    action === 'skip'
      ? result.changes && result.changes.rescheduled && result.changes.rescheduled.length
        ? '关键训练已自动重排'
        : '这次跳过已经记录'
      : sections.length > 1
        ? '后面 7 天已重新排过'
        : '训练日期已更新';

  let summary = '系统已经根据这次操作更新了后续训练。';
  if (action === 'move' && sourceTask && sourceDateKey && targetDateKey) {
    summary = `「${sourceTask.title}」已从 ${formatDateLabel(sourceDateKey)} 调到 ${formatDateLabel(targetDateKey)}，并同步整理了后面几天。`;
  } else if (action === 'skip' && sourceTask && sourceDateKey) {
    summary = `「${sourceTask.title}」已在 ${formatDateLabel(sourceDateKey)} 按跳过处理，系统优先保住了后面的关键训练。`;
  }

  return {
    action,
    title,
    summary,
    strategyText: '默认只处理未来 7 天，并优先保长距离和质量课；非关键训练会优先让位，比赛前两周更偏向删掉而不是继续往后堆。',
    windowText: `只调整未来 ${result.windowDays || 7} 天`,
    summaryCountText,
    sections,
    hasChanges: sections.length > 0,
    explanation: result.explanation || '',
    generatedAt: new Date().toISOString()
  };
}

function getPreviousWeek(referenceDateKey) {
  return getDayKey(addDays(getWeekStart(referenceDateKey || getTodayKey()), -7));
}

function getNextWeek(referenceDateKey) {
  return getDayKey(addDays(getWeekStart(referenceDateKey || getTodayKey()), 7));
}

function getPreviousMonth(referenceDateKey) {
  const date = toDate(referenceDateKey || getTodayKey());
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 15);
  return getDayKey(prevMonth);
}

function getNextMonth(referenceDateKey) {
  const date = toDate(referenceDateKey || getTodayKey());
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 15);
  return getDayKey(nextMonth);
}

module.exports = {
  buildCalendarAdjustment,
  buildMonthView,
  buildWeekView,
  getNextMonth,
  getNextWeek,
  getPreviousMonth,
  getPreviousWeek,
  getMonthEnd,
  getMonthStart,
  getWeekEnd,
  getWeekStart,
  moveTask,
  skipTask
};
