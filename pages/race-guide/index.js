const App = getApp();
const { formatDate } = require('../../utils/util');

Page({
  data: {
    raceCountdown: 0,
    currentPhase: '',
    sections: []
  },

  onLoad() {
    this.loadGuideData();
  },

  onShow() {
    this.loadGuideData();
  },

  loadGuideData() {
    const state = App.getState();
    if (!state.profile) {
      wx.redirectTo({ url: '/pages/onboarding/index' });
      return;
    }

    const raceDate = new Date(state.profile.raceDate);
    const today = new Date();
    const raceCountdown = Math.max(0, Math.ceil((raceDate - today) / (1000 * 60 * 60 * 24)));

    const sections = this.buildSections(raceCountdown, state.profile);

    this.setData({
      raceCountdown,
      currentPhase: this.getCurrentPhase(raceCountdown),
      sections
    });
  },

  getCurrentPhase(raceCountdown) {
    if (raceCountdown <= 7) return '比赛周';
    if (raceCountdown <= 14) return '赛前减量期';
    if (raceCountdown <= 28) return '赛前强化期';
    return '备赛期';
  },

  buildSections(raceCountdown, profile) {
    const sections = [];

    if (raceCountdown <= 7) {
      sections.push({
        title: '比赛周策略',
        icon: '🎯',
        items: [
          { title: '不要再上强度', desc: '这周的目标是保持状态，不是提升能力' },
          { title: '跑量减到平时的50-60%', desc: '轻松跑为主，每次20-30分钟就够了' },
          { title: '不要尝试新装备', desc: '穿你平时训练最习惯的鞋和衣服' },
          { title: '保证睡眠', desc: '比平时早睡30分钟，睡前不要看手机' },
          { title: '碳水储备', desc: '赛前2-3天适当增加主食，但不要暴饮暴食' }
        ]
      });
    }

    if (raceCountdown <= 14) {
      sections.push({
        title: '减量期注意事项',
        icon: '📉',
        items: [
          { title: '长距离缩短到10-12公里', desc: '不要在最后两周跑太长的距离' },
          { title: '质量课改成轻松跑', desc: '不要再追求速度刺激' },
          { title: '不要因为觉得练得不够而加量', desc: '减量是为了让身体恢复，不是偷懒' },
          { title: '注意身体信号', desc: '有任何不适立刻休息，不要硬撑' }
        ]
      });
    }

    sections.push({
      title: '装备建议',
      icon: '👟',
      items: [
        { title: '跑鞋', desc: '必须有一双合脚的跑鞋，不要穿新鞋比赛' },
        { title: '运动袜', desc: '穿专业跑步袜，棉袜容易磨出水泡' },
        { title: '运动内衣（女生）', desc: '选择支撑性好的运动内衣' },
        { title: '腰包或臂包', desc: '用来装手机和能量胶' },
        { title: '运动手表（可选）', desc: '用来监控配速和心率，手机也可以' }
      ]
    });

    sections.push({
      title: '补给策略',
      icon: '🍫',
      items: [
        { title: '能量胶', desc: '每45-60分钟补充一次，赛前要试过' },
        { title: '水站', desc: '每个水站都喝一点，不要等渴了再喝' },
        { title: '运动饮料', desc: '比赛中途补充电解质，防止抽筋' },
        { title: '赛前早餐', desc: '赛前2小时吃完，以碳水为主，避免油腻' }
      ]
    });

    sections.push({
      title: '比赛策略',
      icon: '🏃',
      items: [
        { title: '起跑不要冲', desc: '前5公里比目标配速慢10-15秒/公里' },
        { title: '前半程克制', desc: '感觉轻松是正常的，不要加速' },
        { title: '15公里后才是真正的比赛', desc: '这时候才开始用储备体力' },
        { title: '不要和别人比', desc: '按自己的节奏跑，不要被带快' },
        { title: '跑走结合也可以', desc: '累了就走一会儿，总比跑崩强' }
      ]
    });

    sections.push({
      title: '疲劳vs受伤判断',
      icon: '🏥',
      items: [
        { title: '正常疲劳', desc: '肌肉酸痛、轻微乏力，休息1-2天会好转' },
        { title: '需要注意', desc: '持续酸痛超过3天，某个部位反复不适' },
        { title: '立即停止', desc: '刺痛、锐痛、肿胀、无法正常行走' },
        { title: '什么时候该休息', desc: '疼痛影响正常跑姿时，必须停下来' }
      ]
    });

    sections.push({
      title: '心理建设',
      icon: '💪',
      items: [
        { title: '不要和别人比较', desc: '每个人的基础和目标不同，按自己的节奏来' },
        { title: '训练完成率70%就够了', desc: '不需要100%完成，关键是长距离要跑' },
        { title: '相信训练的力量', desc: '哪怕感觉不够，身体已经在变强' },
        { title: '紧张是正常的', desc: '第一次跑半马紧张很正常，说明你重视' }
      ]
    });

    return sections;
  },

  onBack() {
    wx.navigateBack();
  }
});
