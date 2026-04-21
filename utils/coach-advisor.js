const { formatDate, daysBetween } = require('./util');
const { calculateTrainingLoad, interpretTSB, assessRiskLevel } = require('./load-engine-v2');

const DAILY_TIPS = {
  easy: [
    '轻松跑的关键是"能说话"的节奏，如果喘得说不出完整句子，就慢下来。',
    '今天不追求速度，享受跑步的过程，让身体在有氧区间舒适运转。',
    '轻松跑是建立有氧基础的关键，不要因为觉得太轻松就加速。',
    '保持均匀呼吸，感受脚步的节奏，这是培养跑步感觉的好机会。'
  ],
  long: [
    '长距离慢跑是半马训练的核心，宁可慢一点也不要硬撑。',
    '超过60分钟记得补水和能量，后半程的耐力比速度更重要。',
    '长距离训练的目的是让身体适应长时间运动，不是测试速度。',
    '保持稳定的配速，前半程克制，后半程才能稳住。'
  ],
  quality: [
    '节奏跑的目的是让身体记住目标配速，不是跑得越快越好。',
    '充分热身是质量课的关键，不要跳过热身直接上强度。',
    '如果今天感觉明显疲劳，果断降成轻松跑，不要硬顶。',
    '质量课的质量在于完成度，不在于跑得多快。'
  ],
  recovery: [
    '恢复跑的目的是促进血液循环，帮助身体恢复，不是训练。',
    '如果腿很沉，就改成快走或休息，不要把恢复日跑成训练日。',
    '恢复跑应该比轻松跑更慢，感受身体在慢慢苏醒。',
    '今天的轻松是为了明天的更好表现。'
  ],
  rest: [
    '休息不是偷懒，是让身体适应训练刺激的关键环节。',
    '可以做一些轻松的拉伸或散步，保持身体活跃度。',
    '今晚早点睡，充足的睡眠是最好的恢复。',
    '休息日可以回顾一下本周的训练，为下周做好准备。'
  ],
  strength: [
    '核心力量是让你后半程不掉速的底气，动作质量比数量更重要。',
    '深蹲、弓步、臀桥是跑步者的三大黄金动作。',
    '不要练到第二天腿发软影响跑步，适度是关键。',
    '核心稳定了，跑步姿势才能稳，效率才能高。'
  ],
  cross: [
    '交叉训练是用低冲击方式维持心肺功能，减少关节压力。',
    '骑行、椭圆机、游泳都是不错的选择，保持中等强度即可。',
    '交叉训练日也是给跑步肌群恢复的机会。',
    '不要把交叉训练做成高强度训练，今天的目的是保持有氧。'
  ]
};

const MOTIVATION_QUOTES = [
  '每一次训练都是向目标迈进的一步。',
  '坚持比完美更重要。',
  '今天的努力是明天的底气。',
  '跑步是一场和自己的对话，享受这个过程。',
  '不要和别人比，和昨天的自己比。',
  '完成比完美更重要。',
  '相信训练的力量，相信积累的力量。',
  '每一次出门跑步都是一次胜利。'
];

function generateCoachAdvice(profile, plan, records, currentDate) {
  if (!profile || !plan) {
    return null;
  }

  const today = currentDate || formatDate(new Date());
  const advice = [];

  const trainingAdvice = generateTrainingAdvice(profile, plan, records, today);
  if (trainingAdvice) {
    advice.push(trainingAdvice);
  }

  const loadAdvice = generateLoadAdvice(records, today);
  if (loadAdvice) {
    advice.push(loadAdvice);
  }

  const recoveryAdvice = generateRecoveryAdvice(records, today);
  if (recoveryAdvice) {
    advice.push(recoveryAdvice);
  }

  const motivationAdvice = generateMotivationAdvice(profile, plan, records, today);
  if (motivationAdvice) {
    advice.push(motivationAdvice);
  }

  return {
    date: today,
    advice,
    summary: generateSummary(advice)
  };
}

function generateTrainingAdvice(profile, plan, records, today) {
  const task = plan.tasksByDate ? plan.tasksByDate[today] : null;
  
  if (!task) {
    return null;
  }

  if (task.type === 'rest') {
    const restTips = DAILY_TIPS.rest;
    return {
      type: 'training',
      priority: 'high',
      icon: 'rest',
      title: '今天是休息日',
      message: restTips[Math.floor(Math.random() * restTips.length)],
      action: '享受休息时光'
    };
  }

  const record = records ? records[today] : null;
  
  if (record && record.completion !== 'missed') {
    return {
      type: 'training',
      priority: 'medium',
      icon: 'check',
      title: '训练已完成',
      message: `今天完成了${record.distance || ''}公里的${task.title}，做得很好！`,
      action: '查看训练详情'
    };
  }

  const tips = DAILY_TIPS[task.type] || DAILY_TIPS.easy;
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
  const messages = {
    easy: {
      title: '慢跑训练',
      action: '开始慢跑'
    },
    long: {
      title: '长距离慢跑(LSD)',
      action: '开始长距离'
    },
    quality: {
      title: '节奏跑训练',
      action: '开始节奏跑'
    },
    recovery: {
      title: '恢复跑',
      action: '开始恢复跑'
    },
    strength: {
      title: '核心力量训练',
      action: '开始力量训练'
    },
    cross: {
      title: '交叉训练',
      action: '开始交叉训练'
    },
    mobility: {
      title: '拉伸放松',
      action: '开始拉伸'
    }
  };

  const taskMessage = messages[task.type] || messages.easy;

  return {
    type: 'training',
    priority: 'high',
    icon: task.type,
    title: taskMessage.title,
    message: randomTip,
    action: taskMessage.action
  };
}

function generateLoadAdvice(records, today) {
  const loadData = calculateTrainingLoad(records, today);
  const tsbInterpretation = interpretTSB(loadData.tsb);
  const riskAssessment = assessRiskLevel(loadData);

  if (riskAssessment.level === 'high') {
    return {
      type: 'load',
      priority: 'high',
      icon: 'alert',
      title: '训练负荷过高',
      message: riskAssessment.warnings.join('；'),
      action: '查看训练负荷详情'
    };
  }

  if (riskAssessment.level === 'medium') {
    return {
      type: 'load',
      priority: 'medium',
      icon: 'warning',
      title: '训练负荷偏高',
      message: '身体有些疲劳，建议适当减少训练强度，增加恢复时间。',
      action: '调整训练计划'
    };
  }

  if (loadData.tsb > 10) {
    return {
      type: 'load',
      priority: 'low',
      icon: 'check',
      title: '身体状态良好',
      message: tsbInterpretation.description,
      action: '继续保持'
    };
  }

  return null;
}

function generateRecoveryAdvice(records, today) {
  const recentRecords = getRecentRecords(records, today, 7);
  
  if (recentRecords.length === 0) {
    return null;
  }

  const consecutiveDays = countConsecutiveTrainingDays(recentRecords, today);
  
  if (consecutiveDays >= 4) {
    return {
      type: 'recovery',
      priority: 'high',
      icon: 'rest',
      title: '需要休息',
      message: `已经连续训练${consecutiveDays}天，建议安排一个休息日让身体恢复。`,
      action: '安排休息日'
    };
  }

  const avgRPE = calculateAverageRPE(recentRecords);
  if (avgRPE >= 8) {
    return {
      type: 'recovery',
      priority: 'medium',
      icon: 'warning',
      title: '疲劳累积',
      message: '最近训练强度较高，建议增加睡眠时间，注意营养补充。',
      action: '查看恢复建议'
    };
  }

  return null;
}

function generateMotivationAdvice(profile, plan, records, today) {
  const raceDate = new Date(profile.raceDate);
  const daysToRace = daysBetween(today, profile.raceDate);
  
  if (daysToRace <= 7 && daysToRace > 0) {
    return {
      type: 'motivation',
      priority: 'high',
      icon: 'trophy',
      title: '比赛周',
      message: `距离比赛还有${daysToRace}天！保持轻松，相信自己的训练成果。`,
      action: '查看比赛准备清单'
    };
  }

  if (daysToRace <= 14 && daysToRace > 7) {
    return {
      type: 'motivation',
      priority: 'medium',
      icon: 'star',
      title: '赛前两周',
      message: '比赛临近，开始减量调整，保持身体状态。',
      action: '查看减量建议'
    };
  }

  const weekSummary = calculateWeekSummary(records, today);
  
  if (weekSummary.completionRate >= 80) {
    return {
      type: 'motivation',
      priority: 'low',
      icon: 'star',
      title: '本周表现出色',
      message: `本周训练完成率${weekSummary.completionRate}%，继续保持这个势头！`,
      action: '查看本周总结'
    };
  }

  if (weekSummary.completionRate < 50 && weekSummary.plannedCount > 0) {
    const quote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
    return {
      type: 'motivation',
      priority: 'medium',
      icon: 'encourage',
      title: '继续努力',
      message: quote,
      action: '调整训练计划'
    };
  }

  if (Math.random() < 0.3) {
    const quote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
    return {
      type: 'motivation',
      priority: 'low',
      icon: 'star',
      title: '每日一句',
      message: quote,
      action: '继续加油'
    };
  }

  return null;
}

function getRecentRecords(records, untilDate, days) {
  if (!records) return [];

  const recentRecords = [];
  const cutoffDate = formatDate(new Date(new Date(untilDate).getTime() - days * 24 * 60 * 60 * 1000));

  Object.keys(records)
    .filter(date => date >= cutoffDate && date <= untilDate)
    .forEach(date => {
      recentRecords.push({
        date,
        ...records[date]
      });
    });

  return recentRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function countConsecutiveTrainingDays(records, untilDate) {
  let count = 0;
  let currentDate = new Date(untilDate);

  while (true) {
    const dateKey = formatDate(currentDate);
    const record = records.find(r => r.date === dateKey);

    if (record && record.completion !== 'missed') {
      count++;
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return count;
}

function calculateAverageRPE(records) {
  const recordsWithRPE = records.filter(r => r.rpe && r.rpe > 0);
  if (recordsWithRPE.length === 0) return 0;

  const totalRPE = recordsWithRPE.reduce((sum, r) => sum + r.rpe, 0);
  return totalRPE / recordsWithRPE.length;
}

function calculateWeekSummary(records, untilDate) {
  const weekStart = formatDate(new Date(new Date(untilDate).getTime() - 6 * 24 * 60 * 60 * 1000));
  
  let completedCount = 0;
  let plannedCount = 0;

  Object.keys(records || {})
    .filter(date => date >= weekStart && date <= untilDate)
    .forEach(date => {
      const record = records[date];
      if (record.completion !== 'missed') {
        completedCount++;
      }
      plannedCount++;
    });

  return {
    completedCount,
    plannedCount,
    completionRate: plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0
  };
}

function generateSummary(advice) {
  if (advice.length === 0) {
    return '继续保持，你做得很好！';
  }

  const highPriority = advice.filter(a => a.priority === 'high');
  if (highPriority.length > 0) {
    return highPriority[0].message;
  }

  const mediumPriority = advice.filter(a => a.priority === 'medium');
  if (mediumPriority.length > 0) {
    return mediumPriority[0].message;
  }

  return advice[0].message;
}

function generateDailyDirection(profile, plan, records, currentDate) {
  const today = currentDate || formatDate(new Date());
  const task = plan.tasksByDate ? plan.tasksByDate[today] : null;
  const loadData = calculateTrainingLoad(records, today);
  const tsbInterpretation = interpretTSB(loadData.tsb);

  if (!task) {
    return {
      title: '休息日',
      subtitle: '今天是休息日',
      direction: '好好休息，让身体恢复',
      status: 'rest'
    };
  }

  const directions = {
    easy: {
      title: '轻松跑',
      subtitle: '保持轻松节奏',
      direction: '享受跑步，保持能说话的节奏',
      status: 'easy'
    },
    long: {
      title: '长距离跑',
      subtitle: '提高有氧耐力',
      direction: '注意配速控制，保持均匀呼吸',
      status: 'long'
    },
    quality: {
      title: '质量课',
      subtitle: '提高速度能力',
      direction: '充分热身，按目标配速完成',
      status: 'quality'
    },
    recovery: {
      title: '恢复跑',
      subtitle: '促进身体恢复',
      direction: '保持非常轻松的节奏',
      status: 'recovery'
    },
    rest: {
      title: '休息日',
      subtitle: '身体恢复',
      direction: '好好休息，让身体恢复',
      status: 'rest'
    }
  };

  const direction = directions[task.type] || directions.easy;

  return {
    ...direction,
    task,
    loadStatus: tsbInterpretation.label,
    loadDescription: tsbInterpretation.description
  };
}

module.exports = {
  generateCoachAdvice,
  generateDailyDirection,
  getRecentRecords,
  calculateAverageRPE,
  calculateWeekSummary
};
