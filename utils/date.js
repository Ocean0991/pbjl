const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const parts = value.split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  const current = new Date();
  return new Date(current.getFullYear(), current.getMonth(), current.getDate());
}

function getDayKey(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getTodayKey() {
  return getDayKey(new Date());
}

function addDays(value, count) {
  const date = toDate(value);
  date.setDate(date.getDate() + count);
  return date;
}

function daysBetween(start, end) {
  const startTime = toDate(start).getTime();
  const endTime = toDate(end).getTime();
  return Math.floor((endTime - startTime) / DAY_MS);
}

function formatMonthDay(value) {
  const date = toDate(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateLabel(value) {
  const date = toDate(value);
  return `${formatMonthDay(date)} ${WEEKDAYS[date.getDay()]}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  DAY_MS,
  WEEKDAYS,
  toDate,
  getDayKey,
  getTodayKey,
  addDays,
  daysBetween,
  formatMonthDay,
  formatDateLabel,
  clamp
};
