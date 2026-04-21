const { getTodayKey, daysBetween } = require('./date');
const { createDefaultEcosystemState } = require('./store');

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEcosystemState(input) {
  return Object.assign({}, createDefaultEcosystemState(), input || {});
}

function getTrackableTasks(week) {
  if (!week || !week.days) {
    return [];
  }

  return week.days.filter((task) => task.trackable);
}

function syncEcosystemState(state) {
  const nextState = state;
  nextState.ecosystem = normalizeEcosystemState(nextState.ecosystem);
  const ecosystem = nextState.ecosystem;

  if (nextState.plan && !ecosystem.firstPlanGeneratedAt) {
    ecosystem.firstPlanGeneratedAt = nextState.meta.lastSetupAt || new Date().toISOString();
  }

  if (nextState.plan && nextState.plan.weeks && !ecosystem.firstWeekCompletedAt) {
    const firstWeek = nextState.plan.weeks[0];
    const tasks = getTrackableTasks(firstWeek);
    const firstWeekCompleted =
      tasks.length > 0 &&
      tasks.every((task) => {
        const record = nextState.records[task.dateKey];
        return record && record.completion !== 'missed';
      });

    if (firstWeekCompleted) {
      ecosystem.firstWeekCompletedAt = tasks[tasks.length - 1].dateKey;
    }
  }

  if (nextState.plan && nextState.plan.weeks && !ecosystem.firstLongRunCompletedAt) {
    for (let weekIndex = 0; weekIndex < nextState.plan.weeks.length; weekIndex += 1) {
      const longTask = nextState.plan.weeks[weekIndex].days.find((task) => task.type === 'long');
      if (!longTask) {
        continue;
      }

      const record = nextState.records[longTask.dateKey];
      if (record && record.completion !== 'missed') {
        ecosystem.firstLongRunCompletedAt = longTask.dateKey;
        break;
      }
    }
  }

  return nextState;
}

function registerHomeVisit(state) {
  const nextState = deepClone(state);
  nextState.ecosystem = normalizeEcosystemState(nextState.ecosystem);
  nextState.ecosystem.homeVisitCount += 1;
  return syncEcosystemState(nextState);
}

function markGuideShown(state, type, reason) {
  const nextState = deepClone(state);
  nextState.ecosystem = normalizeEcosystemState(nextState.ecosystem);
  nextState.ecosystem.lastGuideType = type;
  nextState.ecosystem.lastGuideReason = reason;

  if (type === 'mini_program') {
    nextState.ecosystem.miniProgramGuideShownCount += 1;

    if (reason === 'after_setup') {
      nextState.ecosystem.hasShownMiniProgramGuideAfterSetup = true;
    }

    if (reason === 'after_habit') {
      nextState.ecosystem.hasShownMiniProgramGuideAfterHabit = true;
    }

    if (reason === 'after_long_run') {
      nextState.ecosystem.hasShownMiniProgramGuideAfterLongRun = true;
    }
  }

  if (type === 'favorite') {
    nextState.ecosystem.favoriteGuideShownCount += 1;

    if (reason === 'home') {
      nextState.ecosystem.hasShownFavoriteGuideHome = true;
    }

    if (reason === 'adjustment') {
      nextState.ecosystem.hasShownFavoriteGuideAdjustment = true;
    }

    if (reason === 'race_reminder') {
      nextState.ecosystem.hasShownFavoriteGuideRaceReminder = true;
    }
  }

  if (type === 'subscription') {
    nextState.ecosystem.subscriptionGuideShownCount += 1;
  }

  return syncEcosystemState(nextState);
}

function markSubscriptionIntent(state) {
  const nextState = deepClone(state);
  nextState.ecosystem = normalizeEcosystemState(nextState.ecosystem);
  nextState.ecosystem.subscriptionIntentEnabled = true;
  nextState.ecosystem.subscriptionStatus = 'guided';
  nextState.ecosystem.lastSubscriptionActionAt = new Date().toISOString();
  return syncEcosystemState(nextState);
}

function recordFavoriteCallback(state, pageSource) {
  const nextState = deepClone(state);
  nextState.ecosystem = normalizeEcosystemState(nextState.ecosystem);
  nextState.ecosystem.lastFavoritePage = pageSource;
  return syncEcosystemState(nextState);
}

function recordShare(state, shareType, sourcePage) {
  const nextState = deepClone(state);
  nextState.ecosystem = normalizeEcosystemState(nextState.ecosystem);
  nextState.ecosystem.shareSourcePage = sourcePage;

  if (shareType === 'friend') {
    nextState.ecosystem.friendShareCount += 1;
  }

  if (shareType === 'timeline') {
    nextState.ecosystem.timelineShareCount += 1;
  }

  return syncEcosystemState(nextState);
}

function prepareShareMenu() {
  if (!wx.showShareMenu) {
    return;
  }

  try {
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });
  } catch (error) {
    // Ignore unsupported menu configurations and fall back silently.
  }
}

function getPendingMiniProgramGuide(state) {
  const ecosystem = normalizeEcosystemState(state.ecosystem);

  if (state.plan && !ecosystem.hasShownMiniProgramGuideAfterSetup) {
    return {
      reason: 'after_setup',
      title: '把它放进我的小程序，后面会更顺手',
      body: '你已经拿到计划了。后面每天只看今天该练什么，把入口放近一点会更方便。',
      actionText: '看看怎么添加'
    };
  }

  if (ecosystem.homeVisitCount >= 3 && !ecosystem.hasShownMiniProgramGuideAfterHabit) {
    return {
      reason: 'after_habit',
      title: '这几天你已经开始在用了',
      body: '如果你准备继续跟着它练，可以把它加到我的小程序里，打开会更快。',
      actionText: '告诉我怎么加'
    };
  }

  if (ecosystem.firstLongRunCompletedAt && !ecosystem.hasShownMiniProgramGuideAfterLongRun) {
    return {
      reason: 'after_long_run',
      title: '第一次关键长距离已经完成了',
      body: '后面还有更关键的节奏要守住，把它留在手边，比每次重新找更省心。',
      actionText: '继续放近一点'
    };
  }

  return null;
}

function getPendingFavoriteGuide(state, pageSource) {
  const ecosystem = normalizeEcosystemState(state.ecosystem);

  if (pageSource === 'home' && !ecosystem.hasShownFavoriteGuideHome) {
    return {
      reason: 'home',
      title: '今日训练页很适合收藏',
      body: '以后临出门前回来看看今天怎么练，会更顺手。'
    };
  }

  if (pageSource === 'adjustment' && !ecosystem.hasShownFavoriteGuideAdjustment) {
    return {
      reason: 'adjustment',
      title: '这类关键建议页也适合收藏',
      body: '状态差的时候，能更快回来看清楚“今天别乱练什么”。'
    };
  }

  return null;
}

function getShareScenario(state, pageSource) {
  const ecosystem = normalizeEcosystemState(state.ecosystem);
  const todayKey = getTodayKey();

  if (pageSource === 'adjustment') {
    return 'adjustment';
  }

  if (pageSource === 'plan') {
    if (ecosystem.firstWeekCompletedAt) {
      return 'first_week';
    }

    return 'plan_generated';
  }

  if (pageSource === 'me') {
    return 'profile';
  }

  if (pageSource === 'finish') {
    return 'finish';
  }

  if (state.profile && daysBetween(todayKey, state.profile.raceDate) === 21) {
    return 'countdown_21';
  }

  if (ecosystem.firstLongRunCompletedAt) {
    return 'first_long_run';
  }

  if (ecosystem.firstWeekCompletedAt) {
    return 'first_week';
  }

  if (ecosystem.firstPlanGeneratedAt) {
    return 'plan_generated';
  }

  return 'default';
}

function buildSharePayload(state, pageSource) {
  const scenario = getShareScenario(state, pageSource);
  const raceName = state.profile && state.profile.raceName ? state.profile.raceName : '首场半程马拉松';
  const todayPath = '/pages/home/index';

  const map = {
    plan_generated: {
      title: '我开始准备人生第一场半马了',
      desc: '不是硬练，只是每天更清楚今天该怎么跑。',
      path: `${todayPath}?shareScene=plan_generated`,
      query: 'shareScene=plan_generated'
    },
    first_week: {
      title: '第一周练完了，我还在稳稳往前跑',
      desc: '先把节奏跑顺，比逞强更重要。',
      path: `${todayPath}?shareScene=first_week`,
      query: 'shareScene=first_week'
    },
    first_long_run: {
      title: '这周最重要的一次长距离，终于跑完了',
      desc: '跑得不快，但这次守住了。',
      path: `${todayPath}?shareScene=first_long_run`,
      query: 'shareScene=first_long_run'
    },
    countdown_21: {
      title: '距离比赛还有 21 天，我还在稳稳往前跑',
      desc: `${raceName} 倒计时 21 天，先把节奏守住。`,
      path: `${todayPath}?shareScene=countdown_21`,
      query: 'shareScene=countdown_21'
    },
    adjustment: {
      title: '今天不硬顶，按建议慢一点更稳',
      desc: '状态差的时候，先把身体放在前面。',
      path: '/pages/adjustment/index?shareScene=adjustment',
      query: 'shareScene=adjustment'
    },
    profile: {
      title: '我在准备首场半马，先把每天练清楚',
      desc: '不是复杂跑步平台，是更克制的训练陪跑。',
      path: `${todayPath}?shareScene=profile`,
      query: 'shareScene=profile'
    },
    finish: {
      title: '人生第一场半马，终于跑完了',
      desc: '完赛页还没单独做出来，这个分享场景先预留。',
      path: `${todayPath}?shareScene=finish_reserved`,
      query: 'shareScene=finish_reserved'
    },
    default: {
      title: '今天该怎么练，这里会直接告诉我',
      desc: '每天少一点乱练，多一点完赛把握。',
      path: todayPath,
      query: ''
    }
  };

  return map[scenario] || map.default;
}

function getMiniProgramGuideSteps() {
  return [
    '点右上角“···”菜单。',
    '找到“添加到我的小程序”或类似入口。',
    '下次从我的小程序里打开，会更快回到今天训练。'
  ];
}

function getFavoriteGuideSteps(pageLabel) {
  return [
    `现在这个${pageLabel}页很适合收藏。`,
    '点右上角“···”菜单。',
    '选择“收藏”，以后回来会更快。'
  ];
}

module.exports = {
  buildSharePayload,
  getFavoriteGuideSteps,
  getMiniProgramGuideSteps,
  getPendingFavoriteGuide,
  getPendingMiniProgramGuide,
  markGuideShown,
  markSubscriptionIntent,
  normalizeEcosystemState,
  prepareShareMenu,
  recordFavoriteCallback,
  recordShare,
  registerHomeVisit,
  syncEcosystemState
};
