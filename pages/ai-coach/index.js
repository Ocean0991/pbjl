const App = getApp();
const { formatDate } = require('../../utils/util');
const { getTaskForDate, buildRiskSnapshot } = require('../../utils/training-engine');

Page({
  data: {
    messages: [],
    inputText: '',
    scrollToView: '',
    suggestedQuestions: [],
    contextSummary: '',
    isTyping: false
  },

  onLoad() {
    this.buildContext();
    this.initSuggestedQuestions();
    this.addWelcomeMessage();
  },

  buildContext() {
    const state = App.getState();
    if (!state.profile || !state.plan) {
      this.setData({
        contextSummary: '用户尚未完成建档',
        suggestedQuestions: [
          '我该怎么开始跑步训练？',
          '新手应该注意什么？',
          '如何选择第一场比赛？'
        ]
      });
      return;
    }

    const today = formatDate(new Date());
    const todayWorkout = getTaskForDate(state.plan, today);
    const riskSnapshot = buildRiskSnapshot(state, today);
    const profile = state.profile;
    const raceTypeLabels = {
      '5k': '5公里', '10k': '10公里',
      'half_marathon': '半程马拉松', 'full_marathon': '全程马拉松'
    };

    const parts = [];
    parts.push(`目标赛事：${raceTypeLabels[profile.raceType] || '半程马拉松'}`);
    if (profile.raceDate) {
      const daysToRace = Math.ceil((new Date(profile.raceDate) - new Date()) / (1000 * 60 * 60 * 24));
      parts.push(`距离比赛：${Math.max(0, daysToRace)}天`);
    }
    parts.push(`每周训练：${profile.trainingDaysPerWeek || 3}天`);
    parts.push(`最长跑步距离：${profile.longestRunKm || 0}公里`);
    if (todayWorkout) {
      parts.push(`今天训练：${todayWorkout.title} - ${todayWorkout.target}`);
    }
    if (riskSnapshot && riskSnapshot.level !== 'low') {
      parts.push(`当前风险：${riskSnapshot.label}`);
    }

    this.setData({
      contextSummary: parts.join('；')
    });
  },

  initSuggestedQuestions() {
    const state = App.getState();
    if (!state.profile || !state.plan) return;

    const today = formatDate(new Date());
    const todayWorkout = getTaskForDate(state.plan, today);
    const riskSnapshot = buildRiskSnapshot(state, today);

    const questions = [];

    if (todayWorkout && todayWorkout.type !== 'rest') {
      questions.push(`今天${todayWorkout.title}应该怎么跑？`);
      questions.push(`${todayWorkout.title}的配速应该是多少？`);
    }

    if (riskSnapshot && riskSnapshot.level !== 'low') {
      questions.push('我最近状态不太好，该怎么办？');
    }

    questions.push('赛前一周应该怎么调整？');
    questions.push('跑步时膝盖不舒服怎么办？');
    questions.push('长距离跑该怎么补给？');

    this.setData({
      suggestedQuestions: questions.slice(0, 4)
    });
  },

  addWelcomeMessage() {
    const state = App.getState();
    let welcomeText = '你好！我是你的 AI 跑步教练。';

    if (state.profile && state.plan) {
      const today = formatDate(new Date());
      const todayWorkout = getTaskForDate(state.plan, today);
      if (todayWorkout && todayWorkout.type !== 'rest') {
        welcomeText += `今天你的训练是${todayWorkout.title}，有任何问题都可以问我。`;
      } else {
        welcomeText += '今天是休息日，有关于训练、恢复或营养的问题都可以问我。';
      }
    } else {
      welcomeText += '完成建档后，我可以根据你的训练情况给出更精准的建议。';
    }

    this.setData({
      messages: [{
        id: 'welcome',
        role: 'coach',
        content: welcomeText,
        timestamp: Date.now()
      }]
    });
  },

  onInputChange(e) {
    this.setData({ inputText: e.detail.value });
  },

  onSend() {
    const text = this.data.inputText.trim();
    if (!text) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const messages = [...this.data.messages, userMessage];
    this.setData({
      messages,
      inputText: '',
      isTyping: true,
      scrollToView: `msg-${userMessage.id}`
    });

    setTimeout(() => {
      this.generateCoachResponse(text);
    }, 800);
  },

  onSuggestedQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputText: question });
    this.onSend();
  },

  generateCoachResponse(userText) {
    const state = App.getState();
    const today = formatDate(new Date());
    const todayWorkout = state.plan ? getTaskForDate(state.plan, today) : null;
    const riskSnapshot = state.plan ? buildRiskSnapshot(state, today) : null;

    let response = this.buildContextualResponse(userText, state, todayWorkout, riskSnapshot);

    const coachMessage = {
      id: `coach-${Date.now()}`,
      role: 'coach',
      content: response,
      timestamp: Date.now()
    };

    this.setData({
      messages: [...this.data.messages, coachMessage],
      isTyping: false,
      scrollToView: `msg-${coachMessage.id}`
    });
  },

  buildContextualResponse(userText, state, todayWorkout, riskSnapshot) {
    const lowerText = userText.toLowerCase();

    if (lowerText.includes('配速') && todayWorkout) {
      if (todayWorkout.paceTarget) {
        return `今天的${todayWorkout.title}建议配速是 ${todayWorkout.paceTarget}/公里。\n\n${todayWorkout.type === 'long' ? '长距离跑最重要的是稳住节奏，前半程宁可慢一点，后半程再看状态。' : todayWorkout.type === 'quality' ? '质量课的配速可以稍快，但不要把它跑成测试。' : '轻松跑的配速应该能让你全程说短句，如果说不出来就慢一点。'}\n\n${todayWorkout.reminder || ''}`;
      }
      return `今天的${todayWorkout.title}没有具体配速目标，按体感跑就好。${todayWorkout.type === 'easy' ? '轻松跑的标准是能说话的节奏。' : ''}`;
    }

    if (lowerText.includes('膝盖') || lowerText.includes('不舒服') || lowerText.includes('痛')) {
      let response = '如果跑步时膝盖不舒服，首先应该停下来或者降速。以下是一些建议：\n\n1. 减少跑量，把高强度训练改成轻松跑或交叉训练\n2. 跑后做冰敷 15-20 分钟\n3. 加强臀中肌和股四头肌力量训练\n4. 检查跑鞋是否需要更换';
      if (riskSnapshot && riskSnapshot.level !== 'low') {
        response += '\n\n⚠️ 你当前的风险等级较高，建议先休息观察，如果不适持续请咨询医生。';
      }
      response += '\n\n⚠️ 如果不适持续或加重，请暂停训练并咨询医生或专业人士。';
      return response;
    }

    if (lowerText.includes('补给') || lowerText.includes('喝水') || lowerText.includes('能量胶')) {
      return '长距离跑的补给建议：\n\n💧 水分：每 20-30 分钟小口补水，不要等口渴再喝\n🔋 能量胶：超过 60 分钟的长距离，每 45 分钟补充一支能量胶\n🧂 电解质：出汗多时补充含电解质的运动饮料\n\n赛前一天多喝水，但不要过量。比赛当天提前 2 小时喝 400-500ml 水。';
    }

    if (lowerText.includes('赛前') || lowerText.includes('减量') || lowerText.includes('taper')) {
      return '赛前减量（Taper）的核心原则：\n\n📉 赛前 2 周开始减量，跑量降到平时的 70%\n📉 赛前 1 周降到 50%，但保留一点强度刺激\n🏃 赛前 2-3 天只做 20-25 分钟轻松跑\n😴 保证充足睡眠，比平时多睡 30-60 分钟\n🍽️ 赛前 2-3 天增加碳水摄入\n\n减量不是偷懒，它是让身体在比赛日达到最佳状态的关键。';
    }

    if (lowerText.includes('怎么跑') && todayWorkout) {
      let response = `今天的${todayWorkout.title}：\n\n🎯 目标：${todayWorkout.target}\n📝 目的：${todayWorkout.purpose}`;
      if (todayWorkout.paceTarget) {
        response += `\n⏱️ 配速：${todayWorkout.paceTarget}/公里`;
      }
      if (todayWorkout.reminder) {
        response += `\n⚠️ 注意：${todayWorkout.reminder}`;
      }
      if (todayWorkout.avoid) {
        response += `\n🚫 避免：${todayWorkout.avoid}`;
      }
      return response;
    }

    if (lowerText.includes('状态不好') || lowerText.includes('累') || lowerText.includes('疲劳')) {
      let response = '觉得状态不好时，最重要的是不要硬顶：\n\n1. 可以把今天的训练降成轻松跑或快走\n2. 不要为了追进度去补课\n3. 连续几天都觉得累时，整周降强度比只改一天更稳';
      if (riskSnapshot && riskSnapshot.level !== 'low') {
        response += `\n\n你当前的风险等级是${riskSnapshot.label}，${riskSnapshot.nextStep}`;
      }
      return response;
    }

    if (state.profile && state.plan) {
      return `根据你当前的训练情况（${this.data.contextSummary}），我的建议是：\n\n1. 每天优先完成当天训练，不追补、不加码\n2. 长距离是每周最重要的训练，其他都可以让路\n3. 身体信号比课表更重要，觉得累就降\n\n你还可以问我关于配速、补给、赛前策略、伤病预防等问题。`;
    }

    return '我是你的 AI 跑步教练，可以回答以下问题：\n\n🏃 训练相关：今天怎么跑、配速建议、训练安排\n🩹 伤病预防：膝盖不舒服、足底疼痛、恢复建议\n🍎 营养补给：长距离补给、赛前饮食、日常营养\n🎯 比赛策略：赛前减量、配速策略、心理准备\n\n完成建档后，我会根据你的具体情况给出更精准的建议。';
  },

  onBack() {
    wx.navigateBack();
  }
});
