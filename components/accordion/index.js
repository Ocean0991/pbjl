Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    icon: {
      type: String,
      value: ''
    },
    expanded: {
      type: Boolean,
      value: false
    },
    themeClass: {
      type: String,
      value: 'theme-dark'
    }
  },

  data: {
    isExpanded: false
  },

  methods: {
    toggle() {
      const newExpanded = !this.data.isExpanded;
      this.setData({
        isExpanded: newExpanded
      });
      this.triggerEvent('change', { expanded: newExpanded });
    }
  },

  observers: {
    'expanded': function(val) {
      this.setData({
        isExpanded: val
      });
    }
  }
});
