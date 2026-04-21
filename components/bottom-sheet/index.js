Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    themeClass: {
      type: String,
      value: 'theme-dark'
    }
  },

  methods: {
    handleMaskTap() {
      this.triggerEvent('close');
    },

    handleContentTap(e) {
      e.stopPropagation();
    },

    handleClose() {
      this.triggerEvent('close');
    }
  }
});
