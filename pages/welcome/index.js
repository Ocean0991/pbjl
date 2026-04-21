const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark'
  },

  onLoad() {
    const state = app.getState();
    if (state && state.profile && state.plan) {
      wx.switchTab({
        url: '/pages/today/index'
      });
    }
  },

  onShow() {
    this.setData({
      themeClass: app.getThemeClass()
    });
  },

  startSetup() {
    wx.navigateTo({
      url: '/pages/onboarding/index'
    });
  }
});
