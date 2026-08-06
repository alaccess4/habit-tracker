// Тонкая обёртка над Apps Script Web App API.
// Все запросы — POST c Content-Type: text/plain, чтобы не триггерить CORS-preflight
// (Apps Script Web App не умеет корректно отвечать на OPTIONS-preflight).
//
// Бэкенд (apps-script/*.gs) и фронтенд разрабатывались отдельно по общей спецификации,
// поэтому некоторые поля сервера называются/вложены иначе, чем ожидает UI — вся
// подгонка формы ответа сосредоточена здесь, в одном месте, чтобы экраны получали
// уже согласованные данные и не дублировали эту логику.

const cfg = window.APP_CONFIG || {};

class ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiError';
  }
}

async function callApi(action, payload = {}) {
  if (!cfg.APPS_SCRIPT_URL || cfg.APPS_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    throw new ApiError('Не настроен APPS_SCRIPT_URL в frontend/config.js — см. УСТАНОВКА.md');
  }
  const res = await fetch(cfg.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: cfg.AUTH_TOKEN, payload })
  });
  if (!res.ok) {
    throw new ApiError(`Сеть: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.ok) {
    throw new ApiError(json.error || 'Неизвестная ошибка API');
  }
  return json.result;
}

// apiGetToday() -> { date, habits:[{habitId,name,icon,...,completed,value,deadlineCountdownMinutes}], summary:{completedCount,totalScheduledToday,bestCurrentStreak} }
function normalizeToday(raw) {
  const summary = raw.summary || {};
  return {
    date: raw.date,
    completedCount: summary.completedCount || 0,
    totalScheduledToday: summary.totalScheduledToday || 0,
    bestCurrentStreak: summary.bestCurrentStreak || 0,
    habits: (raw.habits || []).map((h) => ({
      habit: {
        id: h.habitId,
        name: h.name,
        icon: h.icon,
        color: h.color,
        unit: h.unit,
        targetType: h.targetType,
        dailyTarget: h.dailyTarget,
        deadlineTime: h.deadlineTime
      },
      habitId: h.habitId,
      value: h.value,
      completed: h.completed,
      scheduled: h.scheduled,
      deadlineCountdownMinutes: h.deadlineCountdownMinutes
    }))
  };
}

// apiGetStats() -> { last7Days:[{date,scheduledCount,completedCount}], completionRate30d, streaks:[{habitId,name,current,longestEver}], totalHabits, totalEntries }
const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
function weekdayShort(dateKeyStr) {
  const [y, m, d] = dateKeyStr.split('-').map(Number);
  return WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()];
}
function normalizeStats(raw) {
  return {
    last7Days: (raw.last7Days || []).map((d) => ({
      date: d.date,
      weekday: weekdayShort(d.date),
      completedCount: d.completedCount,
      scheduledCount: d.scheduledCount,
      completionRate: d.scheduledCount ? d.completedCount / d.scheduledCount : 0
    })),
    habitStreaks: (raw.streaks || []).map((s) => ({ habitId: s.habitId, name: s.name, current: s.current, longestEver: s.longestEver })),
    completionRate30d: raw.completionRate30d || 0,
    totalHabits: raw.totalHabits || 0,
    totalEntries: raw.totalEntries || 0
  };
}

// apiGetCalendar() -> { month, days:[{date,status:'future'|'none'|'full'|'partial'|'missed',habits:[{habitId,name,status}]}] }
function normalizeCalendar(raw) {
  return {
    month: raw.month,
    days: (raw.days || []).map((d) => ({
      date: d.date,
      status: d.status === 'none' ? 'empty' : d.status,
      habits: (d.habits || []).map((h) => ({ habitId: h.habitId, name: h.name, completed: h.status === 'done' }))
    }))
  };
}

// apiGetGoals() -> [{id,habitId,title,startDate,endDate,targetDays,status,progress:{doneCount,targetDays,percent(0-100),status}}]
function normalizeGoal(g) {
  const progress = g.progress || {};
  return {
    id: g.id,
    habitId: g.habitId,
    title: g.title,
    startDate: g.startDate,
    endDate: g.endDate,
    targetDays: g.targetDays,
    status: g.status,
    doneCount: progress.doneCount || 0,
    percent: progress.targetDays ? Math.min(1, (progress.doneCount || 0) / progress.targetDays) : 0
  };
}

// apiGetProfile() -> { settings, achievements, totals:{totalHabits,bestStreakEver,bestCurrentStreak,achievementsUnlocked,achievementsTotal} }
function normalizeProfile(raw) {
  const totals = raw.totals || {};
  return {
    settings: raw.settings || {},
    achievements: raw.achievements || [],
    totalHabits: totals.totalHabits || 0,
    bestStreakEver: totals.bestStreakEver || 0,
    bestCurrentStreak: totals.bestCurrentStreak || 0,
    unlockedAchievements: totals.achievementsUnlocked || 0,
    totalAchievements: totals.achievementsTotal || 0
  };
}

// apiLogEntry() -> { entry, streak, achievementsUnlocked: { unlocked: [...] } }
function normalizeLogEntryResult(raw) {
  return {
    entry: raw.entry,
    streak: raw.streak,
    achievementsUnlocked: (raw.achievementsUnlocked && raw.achievementsUnlocked.unlocked) || []
  };
}

export const api = {
  ping: () => callApi('ping'),
  getHabits: () => callApi('getHabits'),
  createHabit: (habit) => callApi('createHabit', habit),
  updateHabit: (habit) => callApi('updateHabit', habit),
  deleteHabit: (id) => callApi('deleteHabit', { id }),
  logEntry: async (entry) => normalizeLogEntryResult(await callApi('logEntry', entry)),
  getToday: async () => normalizeToday(await callApi('getToday')),
  getStats: async () => normalizeStats(await callApi('getStats')),
  getCalendar: async (month) => normalizeCalendar(await callApi('getCalendar', { month })),
  getAchievements: () => callApi('getAchievements'),
  getProfile: async () => normalizeProfile(await callApi('getProfile')),
  getAvatar: () => callApi('getAvatar'),
  getGoals: async () => (await callApi('getGoals')).map(normalizeGoal),
  createGoal: async (goal) => normalizeGoal(await callApi('createGoal', goal)),
  registerDevice: (device) => callApi('registerDevice', device),
  getSettings: () => callApi('getSettings'),
  updateSettings: (settings) => callApi('updateSettings', settings)
};

export { ApiError };
