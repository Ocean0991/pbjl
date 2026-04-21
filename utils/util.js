const { TRAINING_PHASES, RISK_LEVELS, GOAL_TYPES } = require('./config');

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

function parseDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  return Math.round(Math.abs((d2 - d1) / oneDay));
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getTrainingPhaseLabel(phase) {
  return TRAINING_PHASES[phase] || phase;
}

function getRiskLevelLabel(level) {
  return RISK_LEVELS[level] || level;
}

function getGoalTypeLabel(type) {
  return GOAL_TYPES[type] || type;
}

function calculatePace(seconds, distance) {
  if (!distance || distance === 0) return '0\'00"';
  const paceSeconds = seconds / distance;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds2 = Math.floor(paceSeconds % 60);
  return `${minutes}'${String(seconds2).padStart(2, '0')}"`;
}

function parsePaceToSeconds(paceString) {
  const match = paceString.match(/(\d+)'(\d+)"/);
  if (!match) return 0;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

function formatDistance(kilometers) {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)}米`;
  }
  return `${kilometers.toFixed(1)}公里`;
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

function calculateCalories(distance, weight, duration) {
  const MET = 10;
  const hours = duration / 60;
  return Math.round(MET * weight * hours);
}

function calculateHeartRateZone(maxHR, percentage) {
  return Math.round(maxHR * percentage);
}

function calculateAge(birthYear) {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

function calculateMaxHR(age, method = 'tanaka') {
  if (method === 'tanaka') {
    return 208 - 0.7 * age;
  }
  return 220 - age;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

function hideLoading() {
  wx.hideLoading();
}

function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration
  });
}

function showModal(title, content, confirmText = '确定', cancelText = '取消') {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: (res) => {
        if (res.confirm) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
      fail: reject
    });
  });
}

function navigateTo(url) {
  wx.navigateTo({ url });
}

function redirectTo(url) {
  wx.redirectTo({ url });
}

function switchTab(url) {
  wx.switchTab({ url });
}

function navigateBack(delta = 1) {
  wx.navigateBack({ delta });
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  parseDate,
  addDays,
  daysBetween,
  getWeekNumber,
  getTrainingPhaseLabel,
  getRiskLevelLabel,
  getGoalTypeLabel,
  calculatePace,
  parsePaceToSeconds,
  formatDistance,
  formatDuration,
  calculateCalories,
  calculateHeartRateZone,
  calculateAge,
  calculateMaxHR,
  clamp,
  deepClone,
  debounce,
  throttle,
  showLoading,
  hideLoading,
  showToast,
  showModal,
  navigateTo,
  redirectTo,
  switchTab,
  navigateBack
};
