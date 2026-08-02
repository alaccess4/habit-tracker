/**
 * Трекер привычек — файл 2/8: HTTP-роутер Web App.
 *
 * Все запросы, кроме ping, идут через POST с JSON-телом:
 *   { token: '<AUTH_TOKEN>', action: '<имя>', payload: { ... } }
 *
 * Обработчики физически определены в файлах 03-06 (_habits.gs, _achievements.gs,
 * _avatar.gs, _notifications.gs), но благодаря общему глобальному пространству
 * имён Apps Script (все .gs файлы проекта делят один контекст) ссылаться на них
 * здесь по имени можно без дополнительных импортов.
 */

const ROUTES = {
  ping:            apiPing,

  getHabits:       apiGetHabits,
  createHabit:     apiCreateHabit,
  updateHabit:     apiUpdateHabit,
  deleteHabit:     apiDeleteHabit,

  logEntry:        apiLogEntry,
  getToday:        apiGetToday,
  getStats:        apiGetStats,
  getCalendar:     apiGetCalendar,

  getAchievements: apiGetAchievements,
  getProfile:      apiGetProfile,
  getAvatar:       apiGetAvatar,

  getGoals:        apiGetGoals,
  createGoal:      apiCreateGoal,

  registerDevice:  apiRegisterDevice,

  getSettings:     apiGetSettings,
  updateSettings:  apiUpdateSettings
};

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, error: 'bad json' });
  }

  if (req.token !== getAuthToken()) {
    return jsonOut({ ok: false, error: 'unauthorized' });
  }

  var handler = ROUTES[req.action];
  if (!handler) {
    return jsonOut({ ok: false, error: 'unknown action: ' + req.action });
  }

  try {
    var result = handler(req.payload || {});
    return jsonOut({ ok: true, result: result });
  } catch (err) {
    logLine('ERROR', req.action + ': ' + err.message);
    return jsonOut({ ok: false, error: err.message });
  }
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : null;
  if (action === 'ping') {
    return jsonOut({ ok: true, result: { pong: true, time: nowIso() } });
  }
  return jsonOut({ ok: false, error: 'GET only supports action=ping; use POST for everything else' });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
