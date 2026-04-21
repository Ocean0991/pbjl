const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    principles: [
      {
        title: '先给清楚答案',
        body: '它最重要的工作，不是记录很多数据，而是每天告诉你今天该怎么练。'
      },
      {
        title: '拿不准时先保守',
        body: '如果你很累、没时间、或者训练连续性已经乱了，这一版会优先把你往更稳妥的方向拉。'
      },
      {
        title: '不做复杂平台',
        body: '没有 GPS、没有排行榜、没有内容流，是因为第一版只想把首场赛事陪跑这件事做好。'
      }
    ]
  },

  onShow() {
    this.setData({
      themeClass: app.getThemeClass()
    });
  },

  openFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/index'
    });
  }
});
