const { appendFeedbackEntry, loadFeedbackState } = require('../../utils/feedback-store');

const app = getApp();

Page({
  data: {
    themeClass: 'theme-dark',
    content: '',
    contact: '',
    screenshots: [],
    maxContentLength: 500,
    maxImageCount: 9,
    totalFeedbackCount: 0,
    lastSubmittedAtText: '还没有提交过反馈'
  },

  onShow() {
    const feedbackState = loadFeedbackState();

    this.setData({
      themeClass: app.getThemeClass(),
      totalFeedbackCount: feedbackState.totalCount,
      lastSubmittedAtText: feedbackState.lastSubmittedAt
        ? feedbackState.lastSubmittedAt.slice(0, 16).replace('T', ' ')
        : '还没有提交过反馈'
    });
  },

  handleContentInput(event) {
    this.setData({
      content: event.detail.value || ''
    });
  },

  handleContactInput(event) {
    this.setData({
      contact: event.detail.value || ''
    });
  },

  chooseImages() {
    const remaining = this.data.maxImageCount - this.data.screenshots.length;

    if (remaining <= 0) {
      wx.showToast({
        title: '最多上传 9 张',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (result) => {
        const nextScreenshots = this.data.screenshots.concat(result.tempFilePaths || []).slice(0, this.data.maxImageCount);
        this.setData({
          screenshots: nextScreenshots
        });
      }
    });
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.url;

    if (!current) {
      return;
    }

    wx.previewImage({
      current,
      urls: this.data.screenshots
    });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);

    if (!Number.isFinite(index)) {
      return;
    }

    const screenshots = this.data.screenshots.slice();
    screenshots.splice(index, 1);
    this.setData({ screenshots });
  },

  cancel() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/me/index'
        });
      }
    });
  },

  submitFeedback() {
    const content = (this.data.content || '').trim();
    const contact = (this.data.contact || '').trim();

    if (!content) {
      wx.showToast({
        title: '先写一点你想说的话',
        icon: 'none'
      });
      return;
    }

    const result = appendFeedbackEntry({
      content,
      contact,
      screenshotCount: this.data.screenshots.length
    });

    this.setData({
      content: '',
      contact: '',
      screenshots: [],
      totalFeedbackCount: result.state.totalCount,
      lastSubmittedAtText: result.state.lastSubmittedAt
        ? result.state.lastSubmittedAt.slice(0, 16).replace('T', ' ')
        : '刚刚'
    });

    wx.showToast({
      title: '反馈已记下',
      icon: 'success'
    });
  }
});
