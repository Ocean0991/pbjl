var { getTodayKey, daysBetween } = require('../../utils/date');
var { getGoalLabel, buildRiskSnapshot, summarizeWeek } = require('../../utils/training-engine');
var { buildLoadSnapshot, buildLoadSummaryText } = require('../../utils/load-engine');
var { buildPredictionSnapshot, formatTimeFromSeconds } = require('../../utils/prediction-engine');

var app = getApp();

function buildCoachContext(state, todayKey) {
  var profile = state.profile || {};
  var plan = state.plan || {};
  var planState = state.planState || {};
  var records = state.records || {};
  var riskSnapshot = buildRiskSnapshot(state, todayKey);
  var loadSnapshot = buildLoadSnapshot(state, todayKey);
  var prediction = buildPredictionSnapshot(state, todayKey);
  var weekSummary = summarizeWeek(plan, records, todayKey);

  var recentRecords = [];
  var keys = Object.keys(records).sort().reverse().slice(0, 7);
  for (var i = 0; i < keys.length; i++) {
    var r = records[keys[i]];
    if (r) {
      recentRecords.push({
        dateKey: keys[i],
        completion: r.completion,
        feeling: r.feeling,
        rpe: r.rpe || 0,
        taskType: r.taskType
      });
    }
  }

  return {
    profile: {
      raceType: profile.raceType || 'half',
      raceDate: profile.raceDate || '',
      goalType: planState.currentGoalType || profile.goalType || 'steady',
      longestRunKm: profile.longestRunKm || 0,
      weeklyRuns: profile.recentWeeklyRuns || 0
    },
    plan: {
      currentWeek: weekSummary && weekSummary.week ? weekSummary.week.index : 1,
      goalLabel: planState ? getGoalLabel(planState.currentGoalType) : getGoalLabel(plan.currentGoal),
      totalWeeks: plan.totalWeeks || 12
    },
    risk: {
      level: riskSnapshot.level,
      messages: riskSnapshot.messages
    },
    load: {
      srpeLoad7d: loadSnapshot.srpeLoad7d,
      fatigueScore: loadSnapshot.fatigueScore,
      fitnessScore: loadSnapshot.fitnessScore,
      stateLabel: loadSnapshot.stateLabel
    },
    prediction: {
      predictedTime: formatTimeFromSeconds(prediction.predictedTimeSeconds),
      confidence: prediction.confidenceScore
    },
    recentRecords: recentRecords
  };
}

var PRESET_QUESTIONS = [
  '我现在的训练量够不够？',
  '离目标成绩还有多远？',
  '这周感觉很累怎么办？',
  '长距离跑不完正常吗？',
  '比赛前该怎么调整？'
];

Page({
  data: {
    themeClass: 'theme-dark',
    messages: [],
    inputText: '',
    presetQuestions: PRESET_QUESTIONS,
    contextSummary: '',
    showContext: false,
    sending: false
  },

  onShow() {
    var state = app.getState();
    if (!state.profile || !state.plan) {
      wx.redirectTo({
        url: '/pages/welcome/index'
      });
      return;
    }

    var todayKey = getTodayKey();
    var context = buildCoachContext(state, todayKey);
    var contextSummary = this.buildContextSummaryText(context);

    this.setData({
      themeClass: app.getThemeClass(),
      contextSummary: contextSummary,
      messages: [{
        role: 'coach',
        text: '你好，我是你的训练教练。关于训练安排、配速、恢复、成绩预测，你都可以问我。我会根据你的训练数据来回答。'
      }]
    });
  },

  buildContextSummaryText(context) {
    var parts = [];
    parts.push('赛事类型：' + context.profile.raceType);
    parts.push('目标模式：' + context.plan.goalLabel);
    parts.push('当前周：第 ' + context.plan.currentWeek + ' 周 / 共 ' + context.plan.totalWeeks + ' 周');
    parts.push('风险等级：' + context.risk.level);
    parts.push('7天负荷：' + context.load.srpeLoad7d);
    parts.push('状态：' + context.load.stateLabel);
    parts.push('预测成绩：' + context.prediction.predictedTime);
    parts.push('信心：' + context.prediction.confidence + '%');
    return parts.join('\n');
  },

  updateInput(event) {
    this.setData({
      inputText: event.detail.value || ''
    });
  },

  selectPreset(event) {
    var question = event.currentTarget.dataset.question;
    this.setData({
      inputText: question
    });
    this.sendMessage(question);
  },

  sendMessage(overrideText) {
    var text = overrideText || this.data.inputText;
    if (!text || !text.trim()) return;

    var userMessage = {
      role: 'user',
      text: text.trim()
    };

    var messages = this.data.messages.concat([userMessage]);

    this.setData({
      messages: messages,
      inputText: '',
      sending: true
    });

    var self = this;
    setTimeout(function() {
      var answer = self.generateAnswer(text.trim());
      var coachMessage = {
        role: 'coach',
        text: answer
      };
      self.setData({
        messages: self.data.messages.concat([coachMessage]),
        sending: false
      });
    }, 500);
  },

  generateAnswer(question) {
    var state = app.getState();
    var todayKey = getTodayKey();
    var context = buildCoachContext(state, todayKey);

    if (question.indexOf('训练量') >= 0 || question.indexOf('够不够') >= 0) {
      if (context.load.stateLabel === 'push') {
        return '你当前的训练量是够的，甚至可以稍微加一点。不过新手不建议主动加量，按计划走就行。';
      }
      if (context.load.stateLabel === 'hold') {
        return '你当前的训练量适中，保持现有节奏就好。不要因为觉得"不够"就自己加课，恢复也是训练的一部分。';
      }
      return '你最近疲劳偏高，训练量不是不够，而是需要先恢复。减量一周不会影响最终成绩，但硬撑可能会。';
    }

    if (question.indexOf('目标成绩') >= 0 || question.indexOf('多远') >= 0) {
      return '根据你最近 14 天的训练数据，预测完赛时间是 ' + context.prediction.predictedTime + '，信心指数 ' + context.prediction.confidence + '%。' + (context.prediction.confidence >= 60 ? '目前看完成目标是有希望的。' : '训练数据还不够多，继续坚持才能更准确预测。');
    }

    if (question.indexOf('很累') >= 0 || question.indexOf('累') >= 0) {
      if (context.load.fatigueScore > 60) {
        return '你最近的疲劳指数是 ' + context.load.fatigueScore + '，确实偏高。建议这周减量，把非关键训练改成恢复跑或休息。长距离和恢复跑保住就行，其他可以减。';
      }
      return '疲劳指数 ' + context.load.fatigueScore + '，还在正常范围。如果只是某一天觉得累，可以那天改成轻松跑。如果连续几天都累，那就要注意是不是该减量了。';
    }

    if (question.indexOf('长距离') >= 0 || question.indexOf('跑不完') >= 0) {
      return '长距离跑不完很正常，特别是新手。关键是不要因为跑不完就加量补课。如果配速偏快，试着放慢 10-15 秒/公里。长距离的目的是"能跑完"，不是"跑多快"。';
    }

    if (question.indexOf('比赛前') >= 0 || question.indexOf('调整') >= 0) {
      var daysLeft = state.profile ? daysBetween(todayKey, state.profile.raceDate) : 0;
      if (daysLeft <= 7) {
        return '比赛周了，这周不要加任何训练。把强度降到最低，只做轻松跑和恢复。赛前两天可以完全休息。比赛日按比训练慢 10-15 秒的配速起步。';
      }
      if (daysLeft <= 21) {
        return '距离比赛还有 ' + daysLeft + ' 天，进入减量期。训练量可以减 20-30%，但强度不要降。长距离减到平时的 70% 就行。';
      }
      return '距离比赛还有 ' + daysLeft + ' 天，现在还不用急着调整。按计划训练，把每周的长距离稳住比什么都重要。';
    }

    return '这个问题我暂时没法给出很具体的建议。你可以试试问我关于训练量、目标成绩、疲劳恢复、长距离或者赛前调整的问题，我会根据你的训练数据来回答。';
  },

  toggleContext() {
    this.setData({
      showContext: !this.data.showContext
    });
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: function() {
        wx.switchTab({
          url: '/pages/home/index'
        });
      }
    });
  }
});
