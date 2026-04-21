Component({
  properties: {
    current: {
      type: String,
      value: 'home'
    },
    themeClass: {
      type: String,
      value: 'theme-dark'
    }
  },

  methods: {
    navigate(event) {
      const page = event.currentTarget.dataset.page;
      if (!page || page === this.data.current) {
        return;
      }

      wx.switchTab({
        url: `/pages/${page}/index`
      });
    }
  }
});
