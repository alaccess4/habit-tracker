// Тонкая обёртка над Apps Script Web App API.
// Все запросы — POST c Content-Type: text/plain, чтобы не триггерить CORS-preflight
// (Apps Script Web App не умеет корректно отвечать на OPTIONS-preflight).

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

export const api = {
  ping: () => callApi('ping'),
  getHabits: () => callApi('getHabits'),
  createHabit: (habit) => callApi('createHabit', habit),
  updateHabit: (habit) => callApi('updateHabit', habit),
  deleteHabit: (id) => callApi('deleteHabit', { id }),
  logEntry: (entry) => callApi('logEntry', entry),
  getToday: () => callApi('getToday'),
  getStats: () => callApi('getStats'),
  getCalendar: (month) => callApi('getCalendar', { month }),
  getAchievements: () => callApi('getAchievements'),
  getProfile: () => callApi('getProfile'),
  getAvatar: () => callApi('getAvatar'),
  getGoals: () => callApi('getGoals'),
  createGoal: (goal) => callApi('createGoal', goal),
  registerDevice: (device) => callApi('registerDevice', device),
  getSettings: () => callApi('getSettings'),
  updateSettings: (settings) => callApi('updateSettings', settings)
};

export { ApiError };
