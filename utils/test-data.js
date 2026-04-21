const { formatDate, addDays } = require('./util');

function createTestProfile() {
  return {
    nickname: '测试跑者',
    gender: 'male',
    birthYear: '1990',
    heightCm: 175,
    weightKg: 70,
    restingHeartRate: 60,
    longestRunKm: 10,
    recentWeeklyMileage: 15,
    hasRun10k: true,
    raceType: 'half_marathon',
    raceDate: formatDate(addDays(new Date(), 90)),
    goalType: 'standard_finish',
    trainingDaysPerWeek: 3,
    preferredTrainingDays: [1, 3, 5],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createTestRecords() {
  const records = {};
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const date = formatDate(addDays(today, -i));
    records[date] = {
      dateKey: date,
      completion: 'full',
      distance: Math.round((5 + Math.random() * 5) * 10) / 10,
      duration: Math.round(30 + Math.random() * 30),
      avgPace: Math.round(300 + Math.random() * 120),
      avgHeartRate: Math.round(140 + Math.random() * 20),
      rpe: Math.round(5 + Math.random() * 3),
      feeling: ['great', 'normal', 'tired'][Math.floor(Math.random() * 3)],
      taskType: ['easy', 'long', 'quality'][Math.floor(Math.random() * 3)],
      taskTitle: '测试训练',
      createdAt: new Date().toISOString()
    };
  }
  
  return records;
}

function initializeTestData() {
  const profile = createTestProfile();
  const records = createTestRecords();
  
  return {
    profile,
    records,
    plan: null,
    userInfo: {
      nickname: '测试跑者',
      avatar: ''
    }
  };
}

module.exports = {
  createTestProfile,
  createTestRecords,
  initializeTestData
};
