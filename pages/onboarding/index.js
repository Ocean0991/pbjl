const App = getApp();

Page({
  data: {
    currentStep: 1,
    totalSteps: 5,
    progress: 20,
    profile: {
      nickname: '',
      gender: 'male',
      birthYear: '',
      heightCm: '',
      weightKg: '',
      restingHeartRate: '',
      longestRunKm: '',
      recentWeeklyMileage: '',
      hasRun10k: false,
      raceType: 'half_marathon',
      raceDate: '',
      goalType: 'standard_finish',
      trainingDaysPerWeek: 3,
      preferredTrainingDays: []
    },
    raceTypes: [
      { value: '5k', label: '5公里' },
      { value: '10k', label: '10公里' },
      { value: 'half_marathon', label: '半程马拉松' },
      { value: 'full_marathon', label: '全程马拉松' }
    ],
    raceTypeIndex: 2,
    goalTypes: [
      { value: 'standard_finish', label: '稳完赛' },
      { value: 'conservative_finish', label: '更保守完赛' },
      { value: 'run_walk_finish', label: '跑走结合完赛' },
      { value: 'pb', label: '追求PB' }
    ],
    goalTypeIndex: 0,
    weekdays: [
      { value: 0, label: '日', selected: false },
      { value: 1, label: '一', selected: true },
      { value: 2, label: '二', selected: false },
      { value: 3, label: '三', selected: true },
      { value: 4, label: '四', selected: false },
      { value: 5, label: '五', selected: true },
      { value: 6, label: '六', selected: false }
    ],
    selectedDays: [1, 3, 5]
  },

  onLoad(options) {
    const mode = options.mode;
    if (mode === 'edit') {
      this.loadExistingProfile();
    }
  },

  loadExistingProfile() {
    const state = App.getState();
    if (state.profile) {
      const raceTypeIndex = this.data.raceTypes.findIndex(t => t.value === state.profile.raceType);
      const goalTypeIndex = this.data.goalTypes.findIndex(t => t.value === state.profile.goalType);
      const preferredDays = state.profile.preferredTrainingDays || [1, 3, 5];
      
      const weekdays = this.data.weekdays.map(day => ({
        ...day,
        selected: preferredDays.includes(day.value)
      }));
      
      this.setData({
        profile: { ...this.data.profile, ...state.profile },
        raceTypeIndex: raceTypeIndex >= 0 ? raceTypeIndex : 2,
        goalTypeIndex: goalTypeIndex >= 0 ? goalTypeIndex : 0,
        selectedDays: preferredDays,
        weekdays: weekdays
      });
    }
  },

  onInputNickname(e) {
    this.setData({ 'profile.nickname': e.detail.value });
  },

  onSelectGender(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'profile.gender': value });
  },

  onSelectBirthYear(e) {
    this.setData({ 'profile.birthYear': e.detail.value });
  },

  onInputHeight(e) {
    this.setData({ 'profile.heightCm': e.detail.value });
  },

  onInputWeight(e) {
    this.setData({ 'profile.weightKg': e.detail.value });
  },

  onInputRestingHR(e) {
    this.setData({ 'profile.restingHeartRate': e.detail.value });
  },

  onInputLongestRun(e) {
    this.setData({ 'profile.longestRunKm': e.detail.value });
  },

  onInputWeeklyMileage(e) {
    this.setData({ 'profile.recentWeeklyMileage': e.detail.value });
  },

  onSelectHasRun10k(e) {
    const value = e.currentTarget.dataset.value === 'true';
    this.setData({ 'profile.hasRun10k': value });
  },

  onSelectRaceType(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      raceTypeIndex: index,
      'profile.raceType': this.data.raceTypes[index].value
    });
  },

  onSelectRaceDate(e) {
    this.setData({ 'profile.raceDate': e.detail.value });
  },

  onSelectGoalType(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      goalTypeIndex: index,
      'profile.goalType': this.data.goalTypes[index].value
    });
  },

  onDecreaseTrainingDays() {
    if (this.data.profile.trainingDaysPerWeek > 1) {
      this.setData({
        'profile.trainingDaysPerWeek': this.data.profile.trainingDaysPerWeek - 1
      });
    }
  },

  onIncreaseTrainingDays() {
    if (this.data.profile.trainingDaysPerWeek < 7) {
      this.setData({
        'profile.trainingDaysPerWeek': this.data.profile.trainingDaysPerWeek + 1
      });
    }
  },

  onToggleWeekday(e) {
    const value = e.currentTarget.dataset.value;
    const selectedDays = [...this.data.selectedDays];
    const index = selectedDays.indexOf(value);
    
    if (index > -1) {
      selectedDays.splice(index, 1);
    } else {
      selectedDays.push(value);
    }
    
    selectedDays.sort((a, b) => a - b);
    
    const weekdays = this.data.weekdays.map(day => ({
      ...day,
      selected: selectedDays.includes(day.value)
    }));
    
    this.setData({ 
      selectedDays, 
      weekdays,
      'profile.preferredTrainingDays': selectedDays,
      'profile.trainingDaysPerWeek': selectedDays.length
    });
  },

  onPrevStep() {
    if (this.data.currentStep > 1) {
      const newStep = this.data.currentStep - 1;
      this.setData({
        currentStep: newStep,
        progress: (newStep / this.data.totalSteps) * 100
      });
    }
  },

  onNextStep() {
    if (this.validateCurrentStep()) {
      if (this.data.currentStep < this.data.totalSteps) {
        const newStep = this.data.currentStep + 1;
        this.setData({
          currentStep: newStep,
          progress: (newStep / this.data.totalSteps) * 100
        });
      }
    }
  },

  validateCurrentStep() {
    const { currentStep, profile } = this.data;
    
    switch (currentStep) {
      case 1:
        if (!profile.nickname) {
          wx.showToast({ title: '请输入昵称', icon: 'none' });
          return false;
        }
        if (!profile.birthYear) {
          wx.showToast({ title: '请选择出生年份', icon: 'none' });
          return false;
        }
        return true;
      
      case 2:
        if (!profile.heightCm) {
          wx.showToast({ title: '请输入身高', icon: 'none' });
          return false;
        }
        if (!profile.weightKg) {
          wx.showToast({ title: '请输入体重', icon: 'none' });
          return false;
        }
        return true;
      
      case 3:
        if (!profile.longestRunKm) {
          wx.showToast({ title: '请输入最长跑步距离', icon: 'none' });
          return false;
        }
        return true;
      
      case 4:
        if (!profile.raceDate) {
          wx.showToast({ title: '请选择比赛日期', icon: 'none' });
          return false;
        }
        return true;
      
      case 5:
        if (this.data.selectedDays.length === 0) {
          wx.showToast({ title: '请至少选择一个训练日', icon: 'none' });
          return false;
        }
        return true;
      
      default:
        return true;
    }
  },

  onComplete() {
    if (!this.validateCurrentStep()) {
      return;
    }

    const state = App.getState();
    state.profile = {
      ...this.data.profile,
      preferredTrainingDays: this.data.selectedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    App.setState(() => state);
    
    App.generatePlanForProfile();

    wx.showToast({
      title: '档案创建成功',
      icon: 'success',
      duration: 2000
    });
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/today/index'
      });
    }, 2000);
  }
});
