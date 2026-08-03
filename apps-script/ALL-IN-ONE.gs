/**
 * ТРЕКЕР ПРИВЫЧЕК — ВСЁ В ОДНОМ ФАЙЛЕ
 *
 * Это объединённая версия всех 8 файлов проекта.
 * Вставьте ВЕСЬ этот файл в редактор Apps Script (Код.gs), сохраните,
 * затем выберите функцию setupWorkbook и нажмите «Выполнить».
 *
 * Собрано автоматически из: 01_config.gs ... 08_ui.gs
 */


// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 01_config.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 1/8: конфигурация, схема листов, утилиты.
 *
 * Общая архитектура:
 *   - 5 видимых листов на русском — «человеческое» зеркало данных
 *     (реальный интерфейс — отдельное PWA-приложение, обращающееся сюда как к JSON API).
 *   - 9 скрытых служебных листов (_prefix) — фактическое хранилище.
 *   - Аутентификация Web App — простой статический токен в Script Properties.
 */

// ── Видимые листы (человеко-читаемое зеркало данных) ──────────────────────────
// ── Скрытые служебные листы (фактическое хранилище) ────────────────────────────
const SH = {
  REWARDS:  'Награды',
  CALENDAR: 'Календарь',
  STATS:    'Общая статистика',
  AVATAR:   'Графика',
  PROFILE:  'Профиль',

  HABITS:        '_habits',
  ENTRIES:       '_entries',
  GOALS:         '_goals',
  ACHIEVEMENTS:  '_achievements',
  UNLOCKS:       '_achievement_unlocks',
  AVATAR_STAGES: '_avatar_stages',
  DEVICES:       '_devices',
  REMINDERS:     '_reminders',
  SETTINGS:      '_settings'
};

// ── Script Properties keys ─────────────────────────────────────────────────────
const PROP = {
  AUTH_TOKEN:          'AUTH_TOKEN',
  FCM_SERVICE_ACCOUNT: 'FCM_SERVICE_ACCOUNT',
  TIMEZONE:            'TIMEZONE',
  LOG:                 'LOG'
};

const CFG = {
  TIMEZONE: 'Europe/Moscow',   // значение по умолчанию, переопределяется через _settings.timezone
  LOG_KEEP: 50,
  DEFAULT_REMINDER_OFFSET_MIN: 30
};

// ── Колонки скрытых листов ──────────────────────────────────────────────────────

const HABIT_COL = ['id', 'name', 'icon', 'color', 'unit', 'targetType', 'dailyTarget',
  'scheduleType', 'scheduleDays', 'deadlineTime', 'sortOrder', 'active', 'createdAt'];
const HIX = {};
HABIT_COL.forEach((n, i) => { HIX[n] = i; });

const ENTRY_COL = ['id', 'habitId', 'date', 'value', 'completed', 'completedAt', 'deadlineMet', 'note'];
const EIX = {};
ENTRY_COL.forEach((n, i) => { EIX[n] = i; });

const GOAL_COL = ['id', 'habitId', 'title', 'startDate', 'endDate', 'targetDays', 'status', 'createdAt'];
const GIX = {};
GOAL_COL.forEach((n, i) => { GIX[n] = i; });

const ACHIEVEMENT_COL = ['id', 'title', 'description', 'icon', 'type', 'habitId',
  'thresholdValue', 'sortOrder', 'active'];
const AIX = {};
ACHIEVEMENT_COL.forEach((n, i) => { AIX[n] = i; });

const UNLOCK_COL = ['id', 'achievementId', 'unlockedAt', 'snapshotValue'];
const UIX = {};
UNLOCK_COL.forEach((n, i) => { UIX[n] = i; });

const AVATAR_STAGE_COL = ['stageIndex', 'name', 'thresholdDays', 'svgFile', 'description'];
const ASIX = {};
AVATAR_STAGE_COL.forEach((n, i) => { ASIX[n] = i; });

const DEVICE_COL = ['id', 'deviceLabel', 'fcmToken', 'platform', 'createdAt', 'lastSeenAt', 'active'];
const DIX = {};
DEVICE_COL.forEach((n, i) => { DIX[n] = i; });

const REMINDER_COL = ['id', 'type', 'habitId', 'timeOfDay', 'offsetMinutesBeforeDeadline',
  'daysOfWeek', 'message', 'active', 'lastSentDateKey'];
const RIX = {};
REMINDER_COL.forEach((n, i) => { RIX[n] = i; });

const SETTINGS_COL = ['key', 'value'];
const SIX = {};
SETTINGS_COL.forEach((n, i) => { SIX[n] = i; });

// Карта: имя скрытого листа -> [колонки, индекс-карта] — для генерических хелперов.
const SCHEMA = {};
SCHEMA[SH.HABITS]        = { col: HABIT_COL,        ix: HIX };
SCHEMA[SH.ENTRIES]       = { col: ENTRY_COL,        ix: EIX };
SCHEMA[SH.GOALS]         = { col: GOAL_COL,         ix: GIX };
SCHEMA[SH.ACHIEVEMENTS]  = { col: ACHIEVEMENT_COL,  ix: AIX };
SCHEMA[SH.UNLOCKS]       = { col: UNLOCK_COL,       ix: UIX };
SCHEMA[SH.AVATAR_STAGES] = { col: AVATAR_STAGE_COL, ix: ASIX };
SCHEMA[SH.DEVICES]       = { col: DEVICE_COL,       ix: DIX };
SCHEMA[SH.REMINDERS]     = { col: REMINDER_COL,     ix: RIX };
SCHEMA[SH.SETTINGS]      = { col: SETTINGS_COL,     ix: SIX };

// ══ Базовые хелперы ══════════════════════════════════════════════════════════

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet(name, createIfMissing) {
  const s = ss().getSheetByName(name);
  if (s || !createIfMissing) return s;
  return ss().insertSheet(name);
}

function props() { return PropertiesService.getScriptProperties(); }

function toast(msg, title) {
  try { ss().toast(String(msg).slice(0, 240), title || 'Трекер привычек', 8); } catch (e) { /* не должно ронять вызов */ }
}

// ── Журнал в Script Properties (без отдельного листа) ──────────────────────────

function logLine(level, msg) {
  try {
    const p = props();
    let arr = [];
    try { arr = JSON.parse(p.getProperty(PROP.LOG) || '[]'); } catch (e) { arr = []; }
    arr.unshift({
      t: Utilities.formatDate(new Date(), getTimezone(), 'dd.MM HH:mm:ss'),
      l: level,
      m: String(msg).slice(0, 300)
    });
    p.setProperty(PROP.LOG, JSON.stringify(arr.slice(0, CFG.LOG_KEEP)));
  } catch (e) { /* журнал не должен ронять выполнение */ }
}

function readLog() {
  try { return JSON.parse(props().getProperty(PROP.LOG) || '[]'); } catch (e) { return []; }
}

// ── Время / таймзона ────────────────────────────────────────────────────────────

/** Таймзона: берём из _settings.timezone, если задана, иначе CFG.TIMEZONE. */
function getTimezone() {
  try {
    const v = getSetting_('timezone');
    return v || CFG.TIMEZONE;
  } catch (e) {
    return CFG.TIMEZONE;
  }
}

function todayKey() { return dateKey(new Date()); }

function dateKey(date) { return Utilities.formatDate(date, getTimezone(), 'yyyy-MM-dd'); }

function nowIso() { return new Date().toISOString(); }

/** Текущее время HH:mm в конфигурированной таймзоне. */
function timeOfDayNow() { return Utilities.formatDate(new Date(), getTimezone(), 'HH:mm'); }

function uuid() { return Utilities.getUuid(); }

// ── Auth токен ──────────────────────────────────────────────────────────────────

function getAuthToken() {
  const p = props();
  let token = p.getProperty(PROP.AUTH_TOKEN);
  if (!token) {
    token = Utilities.getUuid();
    p.setProperty(PROP.AUTH_TOKEN, token);
  }
  return token;
}

// ══ Генерические хелперы чтения/записи скрытых листов ═══════════════════════════

/**
 * Возвращает все строки данных (без заголовка) листа sheetName как массив массивов.
 * Пустой лист (или отсутствующий) -> [].
 */
function readRows(sheetName) {
  const sh = sheet(sheetName, false);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

/**
 * Добавляет новую строку в конец листа sheetName, заполняя колонки по имени
 * из valuesObj (пропущенные колонки остаются пустыми). colIx — индекс-карта
 * (например HIX, EIX) для данного листа.
 */
function writeRow(sheetName, colIx, valuesObj) {
  const sh = sheet(sheetName, true);
  const colCount = Object.keys(colIx).length;
  const row = new Array(colCount).fill('');
  Object.keys(valuesObj || {}).forEach(function (k) {
    if (colIx.hasOwnProperty(k)) row[colIx[k]] = valuesObj[k];
  });
  sh.getRange(sh.getLastRow() + 1, 1, 1, colCount).setValues([row]);
  return row;
}

/**
 * Обновляет отдельные колонки существующей строки (1-based индекс строки листа,
 * включая заголовок — т.е. первая строка данных имеет rowIndex1Based = 2).
 */
function updateRow(sheetName, colIx, rowIndex1Based, valuesObj) {
  const sh = sheet(sheetName, true);
  Object.keys(valuesObj || {}).forEach(function (k) {
    if (colIx.hasOwnProperty(k)) {
      sh.getRange(rowIndex1Based, colIx[k] + 1).setValue(valuesObj[k]);
    }
  });
}

/**
 * Находит 1-based индекс строки листа по значению колонки idColName === id.
 * Возвращает -1, если не найдено.
 */
function findRowIndexById(sheetName, idColName, id) {
  const sh = sheet(sheetName, false);
  if (!sh) return -1;
  const schema = SCHEMA[sheetName];
  const colIx = schema ? schema.ix : null;
  const idCol = colIx ? colIx[idColName] : 0;
  const rows = readRows(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) return i + 2; // +1 заголовок, +1 -> 1-based
  }
  return -1;
}

/** Строка листа (массив значений) -> объект по колонкам colArr. */
function rowToObj(row, colArr) {
  const obj = {};
  colArr.forEach(function (n, i) { obj[n] = row[i]; });
  return obj;
}

// ── Настройки (_settings) — низкоуровневые хелперы (используются также apiGetSettings) ──

function getSetting_(key) {
  const rows = readRows(SH.SETTINGS);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][SIX.key]) === key) return rows[i][SIX.value];
  }
  return null;
}

function setSetting_(key, value) {
  const rowIndex = findSettingRowIndex_(key);
  if (rowIndex === -1) {
    writeRow(SH.SETTINGS, SIX, { key: key, value: value });
  } else {
    updateRow(SH.SETTINGS, SIX, rowIndex, { value: value });
  }
}

function findSettingRowIndex_(key) {
  const sh = sheet(SH.SETTINGS, false);
  if (!sh) return -1;
  const rows = readRows(SH.SETTINGS);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][SIX.key]) === key) return i + 2;
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 02_api.gs
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 03_habits.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 3/8: привычки, записи (entries), стрики, дашборд,
 * календарь, статистика, цели, настройки.
 *
 * Дата хранится и сравнивается везде как строка 'yyyy-MM-dd' (dateKey) —
 * это позволяет использовать простое лексикографическое сравнение строк
 * вместо возни с часовыми поясами Date-объектов.
 */

// ══ Внутренние хелперы: привычки ═════════════════════════════════════════════

function habitRowToObj_(row) {
  return {
    id: row[HIX.id],
    name: row[HIX.name],
    icon: row[HIX.icon],
    color: row[HIX.color],
    unit: row[HIX.unit],
    targetType: row[HIX.targetType],
    dailyTarget: Number(row[HIX.dailyTarget]) || 0,
    scheduleType: row[HIX.scheduleType],
    scheduleDays: parseScheduleDays_(row[HIX.scheduleDays]),
    deadlineTime: row[HIX.deadlineTime] || '',
    sortOrder: Number(row[HIX.sortOrder]) || 0,
    active: toBool_(row[HIX.active]),
    createdAt: row[HIX.createdAt]
  };
}

function parseScheduleDays_(v) {
  if (Array.isArray(v)) return v;
  if (v === '' || v === null || v === undefined) return [];
  return String(v).split(',')
    .map(function (s) { return parseInt(s.trim(), 10); })
    .filter(function (n) { return !isNaN(n); });
}

function toBool_(v) {
  if (typeof v === 'boolean') return v;
  if (v === 1) return true;
  var s = String(v).toLowerCase();
  return s === 'true' || s === '1';
}

/** Все привычки (объекты), опционально только активные, отсортированные по sortOrder. */
function getAllHabits_(activeOnly) {
  var rows = readRows(SH.HABITS);
  var list = rows.map(habitRowToObj_);
  if (activeOnly) list = list.filter(function (h) { return h.active; });
  list.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  return list;
}

function getHabitById_(id) {
  var rows = readRows(SH.HABITS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][HIX.id]) === String(id)) return habitRowToObj_(rows[i]);
  }
  return null;
}

// ══ Внутренние хелперы: даты / расписание ════════════════════════════════════

/** yyyy-MM-dd -> ISO-день недели (Пн=1 ... Вс=7). Считается в UTC-полдень, чтобы избежать сдвигов DST. */
function isoWeekdayFromKey_(key) {
  var p = key.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12, 0, 0));
  var wd = d.getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** yyyy-MM-dd + смещение в днях -> новая дата yyyy-MM-dd. */
function addDaysToKey_(key, delta) {
  var p = key.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + delta);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function isScheduledDayKey_(habit, key) {
  if (habit.scheduleType === 'weekly') {
    return habit.scheduleDays.indexOf(isoWeekdayFromKey_(key)) !== -1;
  }
  return true; // daily (или неизвестный тип расписания) — каждый день
}

function minutesFromHHMM_(hhmm) {
  var p = String(hhmm || '').split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}

// ══ Внутренние хелперы: записи (entries) ═════════════════════════════════════

/** 1-based индекс строки листа _entries для habitId+date, либо -1. */
function findEntryRowIndex(habitId, date) {
  var rows = readRows(SH.ENTRIES);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][EIX.habitId]) === String(habitId) && String(rows[i][EIX.date]) === String(date)) {
      return i + 2;
    }
  }
  return -1;
}

function entryRowToObj_(row) {
  return {
    id: row[EIX.id],
    habitId: row[EIX.habitId],
    date: row[EIX.date],
    value: row[EIX.value],
    completed: toBool_(row[EIX.completed]),
    completedAt: row[EIX.completedAt],
    deadlineMet: toBool_(row[EIX.deadlineMet]),
    note: row[EIX.note]
  };
}

/** Все записи привычки как карта dateKey -> объект записи. */
function getEntriesByHabit_(habitId) {
  var rows = readRows(SH.ENTRIES);
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][EIX.habitId]) === String(habitId)) {
      var obj = entryRowToObj_(rows[i]);
      map[obj.date] = obj;
    }
  }
  return map;
}

/** Все записи всех привычек одним проходом: habitId -> dateKey -> объект записи. */
function getAllEntriesIndexed_() {
  var rows = readRows(SH.ENTRIES);
  var map = {};
  rows.forEach(function (row) {
    var obj = entryRowToObj_(row);
    if (!map[obj.habitId]) map[obj.habitId] = {};
    map[obj.habitId][obj.date] = obj;
  });
  return map;
}

// ══ Стрики ════════════════════════════════════════════════════════════════════

/**
 * Возвращает {current, longestEver} для привычки habitId.
 * current — идём назад от сегодня; longestEver — сканируем всю историю вперёд.
 */
function computeStreak(habitId) {
  var habit = getHabitById_(habitId);
  if (!habit) return { current: 0, longestEver: 0 };
  var entriesMap = getEntriesByHabit_(habitId);
  return {
    current: streakBackwardFromKey_(habit, entriesMap, todayKey()),
    longestEver: computeLongestStreak_(habit, entriesMap)
  };
}

function streakBackwardFromKey_(habit, entriesMap, startKey) {
  var count = 0;
  var key = startKey;
  for (var i = 0; i < 3650; i++) {
    if (isScheduledDayKey_(habit, key)) {
      var e = entriesMap[key];
      if (e && e.completed && e.deadlineMet) {
        count++;
      } else {
        break;
      }
    }
    key = addDaysToKey_(key, -1);
  }
  return count;
}

function computeLongestStreak_(habit, entriesMap) {
  var keys = Object.keys(entriesMap);
  if (keys.length === 0) return 0;
  keys.sort();
  var minKey = keys[0];
  var maxKey = keys[keys.length - 1];
  var todayK = todayKey();
  if (todayK > maxKey) maxKey = todayK;
  var best = 0, run = 0, key = minKey, guard = 0;
  while (key <= maxKey && guard < 20000) {
    guard++;
    if (isScheduledDayKey_(habit, key)) {
      var e = entriesMap[key];
      if (e && e.completed && e.deadlineMet) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    key = addDaysToKey_(key, 1);
  }
  return best;
}

/** Лучший текущий стрик среди всех активных привычек. Используется 05_avatar.gs. */
function getBestCurrentStreak() {
  var habits = getAllHabits_(true);
  var best = 0;
  habits.forEach(function (h) {
    var s = computeStreak(h.id).current;
    if (s > best) best = s;
  });
  return best;
}

// ══ API: привычки (CRUD) ══════════════════════════════════════════════════════

function apiPing() {
  return { pong: true, time: nowIso() };
}

function apiGetHabits() {
  return getAllHabits_(true);
}

function apiCreateHabit(payload) {
  payload = payload || {};
  if (!payload.name) throw new Error('name is required');

  var id = uuid();
  var scheduleDays = Array.isArray(payload.scheduleDays) ? payload.scheduleDays.join(',') : (payload.scheduleDays || '');

  writeRow(SH.HABITS, HIX, {
    id: id,
    name: payload.name,
    icon: payload.icon || '',
    color: payload.color || '',
    unit: payload.unit || '',
    targetType: payload.targetType || 'boolean',
    dailyTarget: payload.dailyTarget || 0,
    scheduleType: payload.scheduleType || 'daily',
    scheduleDays: scheduleDays,
    deadlineTime: payload.deadlineTime || '',
    sortOrder: payload.sortOrder === undefined ? 0 : payload.sortOrder,
    active: true,
    createdAt: nowIso()
  });

  rebuildAllViews();
  return getHabitById_(id);
}

function apiUpdateHabit(payload) {
  payload = payload || {};
  if (!payload.id) throw new Error('id is required');
  var rowIx = findRowIndexById(SH.HABITS, 'id', payload.id);
  if (rowIx === -1) throw new Error('habit not found: ' + payload.id);

  var updates = {};
  ['name', 'icon', 'color', 'unit', 'targetType', 'dailyTarget', 'scheduleType',
    'deadlineTime', 'sortOrder', 'active'].forEach(function (f) {
    if (payload[f] !== undefined) updates[f] = payload[f];
  });
  if (payload.scheduleDays !== undefined) {
    updates.scheduleDays = Array.isArray(payload.scheduleDays) ? payload.scheduleDays.join(',') : payload.scheduleDays;
  }

  updateRow(SH.HABITS, HIX, rowIx, updates);
  rebuildAllViews();
  return getHabitById_(payload.id);
}

function apiDeleteHabit(payload) {
  payload = payload || {};
  if (!payload.id) throw new Error('id is required');
  var rowIx = findRowIndexById(SH.HABITS, 'id', payload.id);
  if (rowIx === -1) throw new Error('habit not found: ' + payload.id);

  // Мягкое удаление — никогда не удаляем строку физически, чтобы не потерять историю/стрики.
  updateRow(SH.HABITS, HIX, rowIx, { active: false });
  rebuildAllViews();
  return getHabitById_(payload.id);
}

// ══ API: запись выполнения ════════════════════════════════════════════════════

function apiLogEntry(payload) {
  payload = payload || {};
  if (!payload.habitId) throw new Error('habitId is required');
  var habit = getHabitById_(payload.habitId);
  if (!habit) throw new Error('habit not found: ' + payload.habitId);

  var date = payload.date || todayKey();
  var value = payload.value === undefined ? 1 : payload.value;
  var completed = habit.targetType === 'count'
    ? Number(value) >= Number(habit.dailyTarget)
    : Number(value) === 1;
  var completedAt = nowIso();
  var deadlineMet = true;
  if (habit.deadlineTime) {
    var hhmm = Utilities.formatDate(new Date(completedAt), getTimezone(), 'HH:mm');
    deadlineMet = minutesFromHHMM_(hhmm) <= minutesFromHHMM_(habit.deadlineTime);
  }

  var existingRowIx = findEntryRowIndex(payload.habitId, date);
  var entryId, note;

  var valuesObj = {
    habitId: payload.habitId,
    date: date,
    value: value,
    completed: completed,
    completedAt: completedAt,
    deadlineMet: deadlineMet
  };

  if (existingRowIx === -1) {
    entryId = uuid();
    note = payload.note || '';
    valuesObj.id = entryId;
    valuesObj.note = note;
    writeRow(SH.ENTRIES, EIX, valuesObj);
  } else {
    var rows = readRows(SH.ENTRIES);
    var existingRow = rows[existingRowIx - 2];
    entryId = existingRow[EIX.id];
    note = payload.note !== undefined ? payload.note : existingRow[EIX.note];
    valuesObj.note = note;
    updateRow(SH.ENTRIES, EIX, existingRowIx, valuesObj);
  }

  var streak = computeStreak(payload.habitId);
  var achievementsResult = evaluateAchievements(payload.habitId);
  updateAvatarStage();
  rebuildAllViews();

  return {
    entry: {
      id: entryId, habitId: payload.habitId, date: date, value: value,
      completed: completed, completedAt: completedAt, deadlineMet: deadlineMet, note: note
    },
    streak: streak,
    achievementsUnlocked: achievementsResult
  };
}

// ══ API: сегодня / статистика / календарь ═════════════════════════════════════

function apiGetToday() {
  var todayK = todayKey();
  var habits = getAllHabits_(true);
  var nowHHMM = timeOfDayNow();
  var entriesIndex = getAllEntriesIndexed_();
  var items = [];
  var completedCount = 0;
  var totalScheduledToday = 0;

  habits.forEach(function (h) {
    var scheduled = isScheduledDayKey_(h, todayK);
    var entry = (entriesIndex[h.id] && entriesIndex[h.id][todayK]) || null;
    var completedToday = !!(entry && entry.completed);
    if (scheduled) {
      totalScheduledToday++;
      if (completedToday) completedCount++;
    }

    var deadlineCountdownMinutes = null;
    if (h.deadlineTime && !completedToday) {
      deadlineCountdownMinutes = minutesFromHHMM_(h.deadlineTime) - minutesFromHHMM_(nowHHMM);
    }

    items.push({
      habitId: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      unit: h.unit,
      targetType: h.targetType,
      dailyTarget: h.dailyTarget,
      deadlineTime: h.deadlineTime,
      scheduled: scheduled,
      completed: completedToday,
      value: entry ? entry.value : null,
      deadlineCountdownMinutes: deadlineCountdownMinutes
    });
  });

  return {
    date: todayK,
    habits: items,
    summary: {
      completedCount: completedCount,
      totalScheduledToday: totalScheduledToday,
      bestCurrentStreak: getBestCurrentStreak()
    }
  };
}

function apiGetStats() {
  var habits = getAllHabits_(true);
  var todayK = todayKey();
  var entriesIndex = getAllEntriesIndexed_();

  function isDone_(habitId, key) {
    var e = entriesIndex[habitId] && entriesIndex[habitId][key];
    return !!(e && e.completed && e.deadlineMet);
  }

  // Последние 7 дней — для столбчатой диаграммы.
  var last7 = [];
  for (var i = 6; i >= 0; i--) {
    var key = addDaysToKey_(todayK, -i);
    var scheduledCount = 0, completedCount = 0;
    habits.forEach(function (h) {
      if (dateKeyLE_(dateKeyFromIso_(h.createdAt), key) && isScheduledDayKey_(h, key)) {
        scheduledCount++;
        if (isDone_(h.id, key)) completedCount++;
      }
    });
    last7.push({ date: key, scheduledCount: scheduledCount, completedCount: completedCount });
  }

  // Общий процент выполнения за последние 30 дней.
  var scheduledTotal = 0, completedTotal = 0;
  for (var d = 29; d >= 0; d--) {
    var key30 = addDaysToKey_(todayK, -d);
    habits.forEach(function (h) {
      if (dateKeyLE_(dateKeyFromIso_(h.createdAt), key30) && isScheduledDayKey_(h, key30)) {
        scheduledTotal++;
        if (isDone_(h.id, key30)) completedTotal++;
      }
    });
  }
  var completionRate30 = scheduledTotal > 0 ? completedTotal / scheduledTotal : 0;

  var streaks = habits.map(function (h) {
    var s = computeStreak(h.id);
    return { habitId: h.id, name: h.name, current: s.current, longestEver: s.longestEver };
  });

  var totalEntries = readRows(SH.ENTRIES).length;

  return {
    last7Days: last7,
    completionRate30d: completionRate30,
    streaks: streaks,
    totalHabits: habits.length,
    totalEntries: totalEntries
  };
}

function dateKeyFromIso_(iso) {
  try { return dateKey(new Date(iso)); } catch (e) { return '0000-01-01'; }
}
function dateKeyLE_(a, b) { return a <= b; }

function apiGetCalendar(payload) {
  payload = payload || {};
  var monthStr = payload.month || todayKey().slice(0, 7); // yyyy-MM
  var parts = monthStr.split('-');
  var year = +parts[0], month = +parts[1]; // month 1-based
  var daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  var habits = getAllHabits_(false); // включаем и неактивные — для корректной истории
  var todayK = todayKey();
  var entriesIndex = getAllEntriesIndexed_();
  var days = [];

  for (var d = 1; d <= daysInMonth; d++) {
    var key = monthStr + '-' + (d < 10 ? '0' + d : d);
    var dayHabits = [];
    var scheduledCount = 0, doneCount = 0;
    var isFuture = key > todayK;

    habits.forEach(function (h) {
      var relevant = dateKeyLE_(dateKeyFromIso_(h.createdAt), key) && isScheduledDayKey_(h, key);
      if (!relevant) return;
      scheduledCount++;
      var e = entriesIndex[h.id] && entriesIndex[h.id][key];
      var status;
      if (e) {
        if (e.completed && e.deadlineMet) {
          status = 'done';
          doneCount++;
        } else {
          status = isFuture ? 'not_due' : 'missed';
        }
      } else {
        status = isFuture ? 'not_due' : (key === todayK ? 'pending' : 'missed');
      }
      dayHabits.push({ habitId: h.id, name: h.name, status: status });
    });

    var dayStatus;
    if (isFuture) dayStatus = 'future';
    else if (scheduledCount === 0) dayStatus = 'none';
    else if (doneCount === scheduledCount) dayStatus = 'full';
    else if (doneCount > 0) dayStatus = 'partial';
    else dayStatus = 'missed';

    days.push({ date: key, status: dayStatus, habits: dayHabits });
  }

  return { month: monthStr, days: days };
}

// ══ API: цели ══════════════════════════════════════════════════════════════════

function goalRowToObj_(row) {
  return {
    id: row[GIX.id],
    habitId: row[GIX.habitId],
    title: row[GIX.title],
    startDate: row[GIX.startDate],
    endDate: row[GIX.endDate],
    targetDays: Number(row[GIX.targetDays]) || 0,
    status: row[GIX.status],
    createdAt: row[GIX.createdAt]
  };
}

/**
 * Прогресс цели: считает подходящие записи _entries по habitId в диапазоне
 * [startDate, min(today, endDate)]. Если цель только что достигла порога или
 * просрочена — статус обновляется и сохраняется в лист.
 */
function computeGoalProgress(goal) {
  var todayK = todayKey();
  var effectiveEnd = goal.endDate < todayK ? goal.endDate : todayK;

  var doneCount = 0;
  if (goal.habitId && effectiveEnd >= goal.startDate) {
    var rows = readRows(SH.ENTRIES);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][EIX.habitId]) !== String(goal.habitId)) continue;
      var d = String(rows[i][EIX.date]);
      if (d < goal.startDate || d > effectiveEnd) continue;
      if (toBool_(rows[i][EIX.completed]) && toBool_(rows[i][EIX.deadlineMet])) doneCount++;
    }
  }

  var percent = goal.targetDays > 0 ? Math.min(100, Math.round((doneCount / goal.targetDays) * 100)) : 0;

  var status = goal.status;
  if (status !== 'completed' && status !== 'failed') {
    if (doneCount >= goal.targetDays && goal.targetDays > 0) {
      status = 'completed';
    } else if (todayK > goal.endDate) {
      status = 'failed';
    }
    if (status !== goal.status) {
      var rowIx = findRowIndexById(SH.GOALS, 'id', goal.id);
      if (rowIx !== -1) updateRow(SH.GOALS, GIX, rowIx, { status: status });
    }
  }

  return { doneCount: doneCount, targetDays: goal.targetDays, percent: percent, status: status };
}

function apiGetGoals() {
  var rows = readRows(SH.GOALS);
  return rows.map(function (row) {
    var goal = goalRowToObj_(row);
    var progress = computeGoalProgress(goal);
    goal.status = progress.status;
    goal.progress = progress;
    return goal;
  });
}

function apiCreateGoal(payload) {
  payload = payload || {};
  if (!payload.habitId) throw new Error('habitId is required');
  if (!payload.title) throw new Error('title is required');
  if (!payload.startDate || !payload.endDate) throw new Error('startDate and endDate are required');

  var id = uuid();
  writeRow(SH.GOALS, GIX, {
    id: id,
    habitId: payload.habitId,
    title: payload.title,
    startDate: payload.startDate,
    endDate: payload.endDate,
    targetDays: payload.targetDays || 0,
    status: 'active',
    createdAt: nowIso()
  });

  var rows = readRows(SH.GOALS);
  var row = rows[rows.length - 1];
  var goal = goalRowToObj_(row);
  goal.progress = computeGoalProgress(goal);
  return goal;
}

// ══ API: настройки ═════════════════════════════════════════════════════════════

function apiGetSettings() {
  var rows = readRows(SH.SETTINGS);
  var obj = {};
  rows.forEach(function (row) { obj[row[SIX.key]] = row[SIX.value]; });
  return obj;
}

function apiUpdateSettings(payload) {
  payload = payload || {};
  Object.keys(payload).forEach(function (key) {
    setSetting_(key, payload[key]);
  });
  return apiGetSettings();
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 04_achievements.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 4/8: достижения (награды) и профиль.
 *
 * Типы достижений (ach.type):
 *   'streak'        — текущий стрик (по конкретной привычке или лучший среди всех, если habitId пуст)
 *   'single_value'   — лучшее значение value за один день (по привычке или по всем записям, если habitId пуст)
 *   'goal_complete'  — есть хотя бы одна завершённая цель (по привычке или по всем целям, если habitId пуст)
 *   'total_count'    — общее число выполненных записей (по привычке или по всем, если habitId пуст)
 */

function achievementRowToObj_(row) {
  return {
    id: row[AIX.id],
    title: row[AIX.title],
    description: row[AIX.description],
    icon: row[AIX.icon],
    type: row[AIX.type],
    habitId: row[AIX.habitId] || '',
    thresholdValue: Number(row[AIX.thresholdValue]) || 0,
    sortOrder: Number(row[AIX.sortOrder]) || 0,
    active: toBool_(row[AIX.active])
  };
}

function bestCurrentStreakForHabitOrGlobal_(habitId) {
  return habitId ? computeStreak(habitId).current : getBestCurrentStreak();
}

function bestSingleValue_(habitId) {
  var rows = readRows(SH.ENTRIES);
  var best = 0;
  rows.forEach(function (row) {
    if (habitId && String(row[EIX.habitId]) !== String(habitId)) return;
    var v = Number(row[EIX.value]) || 0;
    if (v > best) best = v;
  });
  return best;
}

function anyGoalCompleted_(habitId) {
  var rows = readRows(SH.GOALS);
  for (var i = 0; i < rows.length; i++) {
    if (habitId && String(rows[i][GIX.habitId]) !== String(habitId)) continue;
    var goal = goalRowToObj_(rows[i]);
    if (computeGoalProgress(goal).status === 'completed') return true;
  }
  return false;
}

function totalCompletedCount_(habitId) {
  var rows = readRows(SH.ENTRIES);
  var count = 0;
  rows.forEach(function (row) {
    if (habitId && String(row[EIX.habitId]) !== String(habitId)) return;
    if (toBool_(row[EIX.completed])) count++;
  });
  return count;
}

/** Текущий прогресс достижения относительно его порога. */
function achievementProgress_(ach) {
  var current = 0;
  var threshold = ach.thresholdValue;

  switch (ach.type) {
    case 'streak':
      current = bestCurrentStreakForHabitOrGlobal_(ach.habitId);
      break;
    case 'single_value':
      current = bestSingleValue_(ach.habitId);
      break;
    case 'goal_complete':
      current = anyGoalCompleted_(ach.habitId) ? 1 : 0;
      threshold = 1;
      break;
    case 'total_count':
      current = totalCompletedCount_(ach.habitId);
      break;
    default:
      current = 0;
  }

  return { current: current, threshold: threshold, met: current >= threshold };
}

function unlockMap_() {
  var rows = readRows(SH.UNLOCKS);
  var map = {};
  rows.forEach(function (row) {
    var achId = row[UIX.achievementId];
    // Если по какой-то причине есть несколько разблокировок — берём самую раннюю.
    if (!map[achId] || row[UIX.unlockedAt] < map[achId].unlockedAt) {
      map[achId] = { unlockedAt: row[UIX.unlockedAt], snapshotValue: row[UIX.snapshotValue] };
    }
  });
  return map;
}

function apiGetAchievements() {
  var rows = readRows(SH.ACHIEVEMENTS);
  var unlocks = unlockMap_();

  var list = rows.map(achievementRowToObj_)
    .filter(function (a) { return a.active; })
    .map(function (a) {
      var unlock = unlocks[a.id];
      var out = {
        id: a.id, title: a.title, description: a.description, icon: a.icon,
        type: a.type, habitId: a.habitId, thresholdValue: a.thresholdValue, sortOrder: a.sortOrder,
        unlocked: !!unlock
      };
      if (unlock) {
        out.unlockedAt = unlock.unlockedAt;
        out.snapshotValue = unlock.snapshotValue;
        out.progress = { current: out.thresholdValue, threshold: out.thresholdValue, percent: 100 };
      } else {
        var p = achievementProgress_(a);
        var percent = p.threshold > 0 ? Math.min(100, Math.round((p.current / p.threshold) * 100)) : 0;
        out.progress = { current: p.current, threshold: p.threshold, percent: percent };
      }
      return out;
    });

  list.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  return list;
}

/**
 * Вызывается из apiLogEntry после записи выполнения. Проверяет глобальные
 * достижения и достижения, привязанные к данной привычке, разблокирует новые.
 */
function evaluateAchievements(habitId) {
  var rows = readRows(SH.ACHIEVEMENTS);
  var unlocks = unlockMap_();
  var newlyUnlocked = [];

  rows.map(achievementRowToObj_).forEach(function (a) {
    if (!a.active) return;
    if (a.habitId && String(a.habitId) !== String(habitId)) return; // достижение привязано к другой привычке
    if (unlocks[a.id]) return; // уже разблокировано

    try {
      var p = achievementProgress_(a);
      if (p.met) {
        writeRow(SH.UNLOCKS, UIX, {
          id: uuid(),
          achievementId: a.id,
          unlockedAt: nowIso(),
          snapshotValue: p.current
        });
        newlyUnlocked.push({
          id: a.id, title: a.title, description: a.description, icon: a.icon,
          type: a.type, habitId: a.habitId, thresholdValue: a.thresholdValue,
          unlockedAt: nowIso(), snapshotValue: p.current
        });
      }
    } catch (e) {
      logLine('WARN', 'evaluateAchievements(' + a.id + '): ' + e.message);
    }
  });

  if (newlyUnlocked.length > 0) {
    try { rebuildRewardsSheet(); } catch (e) { logLine('WARN', 'rebuildRewardsSheet: ' + e.message); }
    try { rebuildProfileSheet(); } catch (e) { logLine('WARN', 'rebuildProfileSheet: ' + e.message); }
  }

  return { unlocked: newlyUnlocked };
}

function bestStreakEverAcrossHabits_() {
  var habits = getAllHabits_(true);
  var best = 0;
  habits.forEach(function (h) {
    var s = computeStreak(h.id).longestEver;
    if (s > best) best = s;
  });
  return best;
}

function apiGetProfile() {
  var settings = apiGetSettings();
  var achievements = apiGetAchievements();
  var habits = getAllHabits_(true);
  var unlockedCount = achievements.filter(function (a) { return a.unlocked; }).length;

  return {
    settings: settings,
    achievements: achievements,
    totals: {
      totalHabits: habits.length,
      bestStreakEver: bestStreakEverAcrossHabits_(),
      bestCurrentStreak: getBestCurrentStreak(),
      achievementsUnlocked: unlockedCount,
      achievementsTotal: achievements.length
    }
  };
}

// ══ Начальные данные ═════════════════════════════════════════════════════════

/** Вызывается один раз из setupWorkbook(), только если лист _achievements пуст. */
function seedDefaultAchievements() {
  var existing = readRows(SH.ACHIEVEMENTS);
  if (existing.length > 0) return;

  var defaults = [
    { title: 'Первый шаг', description: 'Выполните любую привычку в первый раз', icon: 'footprints', type: 'total_count', habitId: '', thresholdValue: 1 },
    { title: 'Неделя силы', description: 'Держите любой стрик 7 дней подряд', icon: 'flame', type: 'streak', habitId: '', thresholdValue: 7 },
    { title: 'Три недели подряд', description: 'Держите любой стрик 21 день подряд', icon: 'medal', type: 'streak', habitId: '', thresholdValue: 21 },
    { title: 'Месяц дисциплины', description: 'Держите любой стрик 30 дней подряд', icon: 'crown', type: 'streak', habitId: '', thresholdValue: 30 },
    { title: '100 выполнений', description: 'Выполните привычки суммарно 100 раз', icon: 'trophy', type: 'total_count', habitId: '', thresholdValue: 100 },
    { title: 'Цель достигнута', description: 'Завершите хотя бы одну цель', icon: 'target', habitId: '', type: 'goal_complete', thresholdValue: 1 },
    { title: '10 000 шагов за день', description: 'Наберите 10 000 за один день по привычке «Шаги» (свяжите habitId с вашей привычкой шагов)', icon: 'sparkles', type: 'single_value', habitId: '', thresholdValue: 10000 },
    { title: 'Звезда привычек', description: 'Выполните привычки суммарно 500 раз', icon: 'star', type: 'total_count', habitId: '', thresholdValue: 500 }
  ];

  defaults.forEach(function (d, i) {
    writeRow(SH.ACHIEVEMENTS, AIX, {
      id: uuid(),
      title: d.title,
      description: d.description,
      icon: d.icon,
      type: d.type,
      habitId: d.habitId,
      thresholdValue: d.thresholdValue,
      sortOrder: i + 1,
      active: true
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 05_avatar.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 5/8: аватар с 29 стадиями (аниме-скелет → легендарный герой).
 *
 * Важно: стадия аватара зависит от ТЕКУЩЕГО лучшего активного стрика
 * (getBestCurrentStreak из 03_habits.gs), а не от рекорда за всё время —
 * персонаж должен визуально «сдуваться», если пользователь прерывает стрик.
 */

function avatarStageRowToObj_(row) {
  return {
    stageIndex: Number(row[ASIX.stageIndex]) || 0,
    name: row[ASIX.name],
    thresholdDays: Number(row[ASIX.thresholdDays]) || 0,
    svgFile: row[ASIX.svgFile],
    description: row[ASIX.description]
  };
}

function getAvatarStages_() {
  return readRows(SH.AVATAR_STAGES).map(avatarStageRowToObj_)
    .sort(function (a, b) { return a.stageIndex - b.stageIndex; });
}

/**
 * Вызывается из apiLogEntry после каждой записи. Пересчитывает лучший текущий
 * стрик, определяет подходящую стадию и сохраняет её в _settings.
 */
function updateAvatarStage() {
  var bestCurrentStreak = getBestCurrentStreak();
  var stages = getAvatarStages_();

  var current = stages[0] || null;
  stages.forEach(function (s) {
    if (s.thresholdDays <= bestCurrentStreak) current = s;
  });

  if (current) {
    setSetting_('avatarStageIndex', current.stageIndex);
    setSetting_('avatarStreakSnapshot', bestCurrentStreak);
  }

  try { rebuildAvatarSheet(); } catch (e) { logLine('WARN', 'rebuildAvatarSheet: ' + e.message); }

  return current;
}

function apiGetAvatar() {
  var bestCurrentStreak = getBestCurrentStreak();
  var stages = getAvatarStages_();

  var current = stages[0] || null;
  var next = null;
  for (var i = 0; i < stages.length; i++) {
    if (stages[i].thresholdDays <= bestCurrentStreak) {
      current = stages[i];
    } else {
      next = stages[i];
      break;
    }
  }

  return {
    currentStageIndex: current ? current.stageIndex : 0,
    stage: current,
    bestCurrentStreak: bestCurrentStreak,
    daysToNextStage: next ? (next.thresholdDays - bestCurrentStreak) : null,
    nextStage: next
  };
}

// ══ Начальные данные ═════════════════════════════════════════════════════════

/** Вызывается один раз из setupWorkbook(), только если лист _avatar_stages пуст. */
function seedDefaultAvatarStages() {
  var existing = readRows(SH.AVATAR_STAGES);
  if (existing.length > 0) return;

  var stages = [
    { stageIndex: 1, name: 'Скелет', thresholdDays: 0, svgFile: 'stage-01.png', description: 'Всё только начинается — ни одного дня стрика ещё нет.' },
    { stageIndex: 2, name: 'Новичок', thresholdDays: 2, svgFile: 'stage-02.png', description: 'Встал на ноги — первые дни подряд.' },
    { stageIndex: 3, name: 'Пробуждение', thresholdDays: 4, svgFile: 'stage-03.png', description: 'Появляется уверенность в движениях.' },
    { stageIndex: 4, name: 'Оживление', thresholdDays: 6, svgFile: 'stage-04.png', description: 'Тело понемногу наполняется силой.' },
    { stageIndex: 5, name: 'Плоть', thresholdDays: 8, svgFile: 'stage-05.png', description: 'Уже не просто кости — растёт выносливость.' },
    { stageIndex: 6, name: 'Ученик', thresholdDays: 10, svgFile: 'stage-06.png', description: 'Первое снаряжение — привычка входит в ритм.' },
    { stageIndex: 7, name: 'Воин', thresholdDays: 12, svgFile: 'stage-07.png', description: 'Базовая броня — уверенная поступь.' },
    { stageIndex: 8, name: 'Щитоносец', thresholdDays: 15, svgFile: 'stage-08.png', description: 'Щит и меч — готовность держать удар.' },
    { stageIndex: 9, name: 'Латник', thresholdDays: 18, svgFile: 'stage-09.png', description: 'Полное лёгкое снаряжение.' },
    { stageIndex: 10, name: 'Кольчужник', thresholdDays: 21, svgFile: 'stage-10.png', description: 'Три недели подряд — кольчуга и длинный меч.' },
    { stageIndex: 11, name: 'Рыцарь', thresholdDays: 24, svgFile: 'stage-11.png', description: 'Стальной нагрудник и плащ.' },
    { stageIndex: 12, name: 'Латный рыцарь', thresholdDays: 28, svgFile: 'stage-12.png', description: 'Полные латы с наплечниками.' },
    { stageIndex: 13, name: 'Хранитель', thresholdDays: 32, svgFile: 'stage-13.png', description: 'Шлем в руке, щит с гербом.' },
    { stageIndex: 14, name: 'Страж', thresholdDays: 36, svgFile: 'stage-14.png', description: 'Шлем надет — истинный страж дисциплины.' },
    { stageIndex: 15, name: 'Заряженный', thresholdDays: 40, svgFile: 'stage-15.png', description: 'Меч искрит — сила растёт.' },
    { stageIndex: 16, name: 'Сияющий', thresholdDays: 44, svgFile: 'stage-16.png', description: 'Тонкая аура окружает доспехи.' },
    { stageIndex: 17, name: 'Осиянный', thresholdDays: 48, svgFile: 'stage-17.png', description: 'Золотые узоры, свечение ярче.' },
    { stageIndex: 18, name: 'Рунный', thresholdDays: 52, svgFile: 'stage-18.png', description: 'Руны на доспехах загораются.' },
    { stageIndex: 19, name: 'Крылатый', thresholdDays: 56, svgFile: 'stage-19.png', description: 'Появляются светящиеся крылья.' },
    { stageIndex: 20, name: 'Парящий', thresholdDays: 60, svgFile: 'stage-20.png', description: 'Два месяца подряд — молниеносный клинок.' },
    { stageIndex: 21, name: 'Триумфатор', thresholdDays: 65, svgFile: 'stage-21.png', description: 'Крылья во всю ширь, торжествующая поза.' },
    { stageIndex: 22, name: 'Грозовой', thresholdDays: 70, svgFile: 'stage-22.png', description: 'Молнии окружают тело сплошной аурой.' },
    { stageIndex: 23, name: 'Коронованный', thresholdDays: 75, svgFile: 'stage-23.png', description: 'На голове засияла корона.' },
    { stageIndex: 24, name: 'Золотой герой', thresholdDays: 80, svgFile: 'stage-24.png', description: 'Полностью золотое сияние.' },
    { stageIndex: 25, name: 'Легендарный', thresholdDays: 85, svgFile: 'stage-25.png', description: 'Фиолетово-розовая легендарная форма.' },
    { stageIndex: 26, name: 'Пробуждённый', thresholdDays: 90, svgFile: 'stage-26.png', description: 'Мощная грозовая аура в цветах легенды.' },
    { stageIndex: 27, name: 'Клинок Света', thresholdDays: 95, svgFile: 'stage-27.png', description: 'Два клинка света, парящая поступь.' },
    { stageIndex: 28, name: 'Вихрь Силы', thresholdDays: 100, svgFile: 'stage-28.png', description: 'Энергия закручивается вокруг героя.' },
    { stageIndex: 29, name: 'Легенда', thresholdDays: 110, svgFile: 'stage-29.png', description: 'Финальная форма — живое воплощение дисциплины.' }
  ];

  stages.forEach(function (s) { writeRow(SH.AVATAR_STAGES, ASIX, s); });
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 06_notifications.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 6/8: устройства, FCM push-уведомления, напоминания.
 *
 * Требует Script Property FCM_SERVICE_ACCOUNT — JSON сервисного аккаунта Firebase
 * ({client_email, private_key, project_id}) — см. УСТАНОВКА.md фронтенд-проекта.
 */

// ══ Устройства ════════════════════════════════════════════════════════════════

function findDeviceRowIndexByToken_(fcmToken) {
  var rows = readRows(SH.DEVICES);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][DIX.fcmToken]) === String(fcmToken)) return i + 2;
  }
  return -1;
}

function apiRegisterDevice(payload) {
  payload = payload || {};
  if (!payload.fcmToken) throw new Error('fcmToken is required');

  var rowIx = findDeviceRowIndexByToken_(payload.fcmToken);
  if (rowIx === -1) {
    var id = uuid();
    writeRow(SH.DEVICES, DIX, {
      id: id,
      deviceLabel: payload.label || '',
      fcmToken: payload.fcmToken,
      platform: payload.platform || '',
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      active: true
    });
    return { id: id, fcmToken: payload.fcmToken, platform: payload.platform || '', label: payload.label || '', active: true };
  }

  var updates = { lastSeenAt: nowIso(), active: true };
  if (payload.label !== undefined) updates.deviceLabel = payload.label;
  if (payload.platform !== undefined) updates.platform = payload.platform;
  updateRow(SH.DEVICES, DIX, rowIx, updates);

  var rows = readRows(SH.DEVICES);
  var row = rows[rowIx - 2];
  return {
    id: row[DIX.id], fcmToken: row[DIX.fcmToken], platform: row[DIX.platform],
    label: row[DIX.deviceLabel], active: true
  };
}

function getActiveDeviceTokens_() {
  return readRows(SH.DEVICES)
    .filter(function (row) { return toBool_(row[DIX.active]); })
    .map(function (row) { return row[DIX.fcmToken]; })
    .filter(Boolean);
}

// ══ FCM (Firebase Cloud Messaging) — OAuth2 JWT-bearer, без внешних библиотек ═══

function getFcmAccessToken() {
  var cached = CacheService.getScriptCache().get('fcm_access_token');
  if (cached) return cached;
  var raw = props().getProperty(PROP.FCM_SERVICE_ACCOUNT);
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT script property not set — see УСТАНОВКА.md');
  var sa = JSON.parse(raw); // {client_email, private_key, project_id}
  var now = Math.floor(Date.now() / 1000);
  var header = { alg: 'RS256', typ: 'JWT' };
  var claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  var toSign = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claim));
  var sigBytes = Utilities.computeRsaSha256Signature(toSign, sa.private_key);
  var jwt = toSign + '.' + b64url(sigBytes);
  var resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt },
    muteHttpExceptions: true
  });
  var json = JSON.parse(resp.getContentText());
  if (!json.access_token) throw new Error('FCM auth failed: ' + resp.getContentText());
  CacheService.getScriptCache().put('fcm_access_token', json.access_token, 3300);
  return json.access_token;
}

function b64url(input) {
  var bytes = (typeof input === 'string') ? Utilities.newBlob(input).getBytes() : input;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function sendPush(fcmToken, title, body, data) {
  var sa = JSON.parse(props().getProperty(PROP.FCM_SERVICE_ACCOUNT));
  var url = 'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send';
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getFcmAccessToken() },
    payload: JSON.stringify({ message: { token: fcmToken, notification: { title: title, body: body }, data: data || {} } }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() >= 300) logLine('WARN', 'push failed: ' + resp.getContentText());
  return resp.getResponseCode() < 300;
}

/** Отправляет push всем активным устройствам. Возвращает число успешных отправок. */
function sendPushToAllDevices_(title, body, data) {
  var tokens = getActiveDeviceTokens_();
  var sent = 0;
  tokens.forEach(function (token) {
    try {
      if (sendPush(token, title, body, data)) sent++;
    } catch (e) {
      logLine('WARN', 'sendPush(' + token + '): ' + e.message);
    }
  });
  return sent;
}

// ══ Напоминания ═══════════════════════════════════════════════════════════════

/** Добавляет строку в лист sheetName и возвращает её 1-based индекс. */
function writeRowGetIndex_(sheetName, colIx, valuesObj) {
  writeRow(sheetName, colIx, valuesObj);
  return sheet(sheetName, true).getLastRow();
}

function reminderRowToObj_(row) {
  return {
    id: row[RIX.id],
    type: row[RIX.type],
    habitId: row[RIX.habitId] || '',
    timeOfDay: row[RIX.timeOfDay] || '',
    offsetMinutesBeforeDeadline: row[RIX.offsetMinutesBeforeDeadline],
    daysOfWeek: parseScheduleDays_(row[RIX.daysOfWeek]),
    message: row[RIX.message] || '',
    active: toBool_(row[RIX.active]),
    lastSentDateKey: row[RIX.lastSentDateKey] || ''
  };
}

/** Находит существующее напоминание типа habit_deadline для привычки, либо создаёт его. */
function findOrCreateHabitDeadlineReminder_(habitId) {
  var rows = readRows(SH.REMINDERS);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][RIX.type] === 'habit_deadline' && String(rows[i][RIX.habitId]) === String(habitId)) {
      return { rowIx: i + 2, obj: reminderRowToObj_(rows[i]) };
    }
  }
  var rowIx = writeRowGetIndex_(SH.REMINDERS, RIX, {
    id: uuid(),
    type: 'habit_deadline',
    habitId: habitId,
    timeOfDay: '',
    offsetMinutesBeforeDeadline: CFG.DEFAULT_REMINDER_OFFSET_MIN,
    daysOfWeek: '',
    message: '',
    active: true,
    lastSentDateKey: ''
  });
  var newRows = readRows(SH.REMINDERS);
  return { rowIx: rowIx, obj: reminderRowToObj_(newRows[rowIx - 2]) };
}

/**
 * Функция для триггера каждые 15 минут (устанавливается вручную или через
 * installReminderTrigger()). Каждая итерация обёрнута в try/catch — одна
 * плохая строка не должна останавливать весь прогон.
 */
function checkReminders() {
  var todayK = todayKey();
  var nowMinutes = minutesFromHHMM_(timeOfDayNow());
  var todayWeekday = isoWeekdayFromKey_(todayK);

  // (a) Напоминания о дедлайне привычки.
  getAllHabits_(true).forEach(function (habit) {
    try {
      if (!habit.deadlineTime) return;

      var reminder = findOrCreateHabitDeadlineReminder_(habit.id);
      if (!reminder.obj.active) return;
      if (reminder.obj.lastSentDateKey === todayK) return; // уже отправлено сегодня

      var offset = Number(reminder.obj.offsetMinutesBeforeDeadline) || CFG.DEFAULT_REMINDER_OFFSET_MIN;
      var deadlineMinutes = minutesFromHHMM_(habit.deadlineTime);
      var windowOpenMinutes = deadlineMinutes - offset;

      if (nowMinutes < windowOpenMinutes || nowMinutes >= deadlineMinutes) return; // окно ещё не открылось или дедлайн уже прошёл

      var entryRowIx = findEntryRowIndex(habit.id, todayK);
      var alreadyDone = false;
      if (entryRowIx !== -1) {
        var rows = readRows(SH.ENTRIES);
        alreadyDone = toBool_(rows[entryRowIx - 2][EIX.completed]);
      }
      if (alreadyDone) return;

      var title = 'Трекер привычек';
      var body = '⏰ ' + habit.name + ' — дедлайн в ' + habit.deadlineTime + ', ещё не выполнено';
      sendPushToAllDevices_(title, body, { type: 'habit_deadline', habitId: habit.id });

      updateRow(SH.REMINDERS, RIX, reminder.rowIx, { lastSentDateKey: todayK });
    } catch (e) {
      logLine('WARN', 'checkReminders habit_deadline(' + habit.id + '): ' + e.message);
    }
  });

  // (b) Общие напоминания.
  readRows(SH.REMINDERS).forEach(function (row, idx) {
    try {
      var r = reminderRowToObj_(row);
      if (r.type !== 'general') return;
      if (!r.active) return;
      if (r.lastSentDateKey === todayK) return;
      if (!r.timeOfDay) return;

      var reminderMinutes = minutesFromHHMM_(r.timeOfDay);
      var withinWindow = nowMinutes >= reminderMinutes && (nowMinutes - reminderMinutes) < 15;
      if (!withinWindow) return;

      if (r.daysOfWeek.length > 0 && r.daysOfWeek.indexOf(todayWeekday) === -1) return;

      sendPushToAllDevices_('Трекер привычек', r.message || 'Напоминание', { type: 'general', reminderId: r.id });

      updateRow(SH.REMINDERS, RIX, idx + 2, { lastSentDateKey: todayK });
    } catch (e) {
      logLine('WARN', 'checkReminders general(row ' + (idx + 2) + '): ' + e.message);
    }
  });
}

/** Устанавливает триггер checkReminders каждые 15 минут (не дублирует, если уже установлен). */
function installReminderTrigger() {
  var already = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'checkReminders';
  });
  if (already) {
    toast('Триггер напоминаний уже установлен');
    return;
  }
  ScriptApp.newTrigger('checkReminders').timeBased().everyMinutes(15).create();
  toast('Триггер напоминаний установлен (каждые 15 минут)');
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 07_sheets.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 7/8: настройка таблицы и пересборка человеко-читаемых
 * видимых листов из данных скрытых служебных листов.
 *
 * Видимые листы — это вторичное «зеркало для подглядывания» в данные; основной
 * интерфейс — отдельное PWA-приложение, обращающееся к Web App как к JSON API.
 */

/** Пишет строки (с паддингом до одинаковой ширины) в лист, жирным — заданные строки. */
function writeSheetRows_(sh, rows, boldRowIndices) {
  if (rows.length === 0) return;
  var maxCols = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
  var padded = rows.map(function (r) {
    var copy = r.slice();
    while (copy.length < maxCols) copy.push('');
    return copy;
  });
  sh.getRange(1, 1, padded.length, maxCols).setValues(padded);
  (boldRowIndices || []).forEach(function (r) {
    sh.getRange(r, 1, 1, maxCols).setFontWeight('bold');
  });
  try { sh.autoResizeColumns(1, maxCols); } catch (e) { /* не критично */ }
}

function statusRu_(status) {
  var map = {
    full: 'выполнено полностью', partial: 'частично', missed: 'пропущено',
    future: 'ещё не наступил', none: 'нет привычек', done: 'выполнено',
    not_due: 'ожидается', pending: 'в процессе'
  };
  return map[status] || status;
}

// ══ Настройка ═════════════════════════════════════════════════════════════════

function ensureHiddenSheet_(name) {
  var sh = sheet(name, true);
  var schema = SCHEMA[name];
  if (schema && sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, schema.col.length).setValues([schema.col]);
    sh.getRange(1, 1, 1, schema.col.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  try { sh.hideSheet(); } catch (e) { /* уже скрыт */ }
  return sh;
}

/** Главная функция первичной настройки — запускается вручную из редактора/меню. */
function setupWorkbook() {
  [SH.REWARDS, SH.CALENDAR, SH.STATS, SH.AVATAR, SH.PROFILE].forEach(function (name) {
    sheet(name, true);
  });

  Object.keys(SCHEMA).forEach(function (name) { ensureHiddenSheet_(name); });

  seedDefaultAchievements();
  seedDefaultAvatarStages();

  if (!getSetting_('timezone')) setSetting_('timezone', CFG.TIMEZONE);

  getAuthToken(); // гарантируем, что токен сгенерирован

  rebuildAllViews();

  toast('Настройка завершена');
}

// ══ Пересборка видимых листов ═══════════════════════════════════════════════

function rebuildAllViews() {
  [rebuildCalendarSheet, rebuildStatsSheet, rebuildRewardsSheet, rebuildAvatarSheet, rebuildProfileSheet]
    .forEach(function (fn) {
      try { fn(); } catch (e) { logLine('ERROR', 'rebuildAllViews/' + fn.name + ': ' + e.message); }
    });
}

function rebuildStatsSheet() {
  var data = apiGetStats();
  var sh = sheet(SH.STATS, true);
  sh.clearContents();

  var rows = [], bold = [];
  rows.push(['Общая статистика']); bold.push(rows.length);
  rows.push(['Обновлено: ' + Utilities.formatDate(new Date(), getTimezone(), 'dd.MM.yyyy HH:mm')]);
  rows.push([]);
  rows.push(['Последние 7 дней']); bold.push(rows.length);
  rows.push(['Дата', 'Запланировано', 'Выполнено']); bold.push(rows.length);
  data.last7Days.forEach(function (d) { rows.push([d.date, d.scheduledCount, d.completedCount]); });
  rows.push([]);
  rows.push(['Процент выполнения за 30 дней', Math.round(data.completionRate30d * 1000) / 10 + '%']);
  rows.push(['Всего привычек', data.totalHabits]);
  rows.push(['Всего записей', data.totalEntries]);
  rows.push([]);
  rows.push(['Стрики по привычкам']); bold.push(rows.length);
  rows.push(['Привычка', 'Текущий стрик', 'Рекорд']); bold.push(rows.length);
  data.streaks.forEach(function (s) { rows.push([s.name, s.current, s.longestEver]); });

  writeSheetRows_(sh, rows, bold);
}

function rebuildRewardsSheet() {
  var achievements = apiGetAchievements();
  var sh = sheet(SH.REWARDS, true);
  sh.clearContents();

  var rows = [], bold = [];
  rows.push(['Награды']); bold.push(rows.length);
  rows.push(['Обновлено: ' + Utilities.formatDate(new Date(), getTimezone(), 'dd.MM.yyyy HH:mm')]);
  rows.push([]);
  rows.push(['Иконка', 'Название', 'Описание', 'Тип', 'Статус', 'Прогресс', 'Разблокировано']); bold.push(rows.length);
  achievements.forEach(function (a) {
    rows.push([
      a.icon, a.title, a.description, a.type,
      a.unlocked ? 'Получено' : 'В процессе',
      a.progress.current + ' / ' + a.progress.threshold + ' (' + a.progress.percent + '%)',
      a.unlocked ? Utilities.formatDate(new Date(a.unlockedAt), getTimezone(), 'dd.MM.yyyy HH:mm') : ''
    ]);
  });

  writeSheetRows_(sh, rows, bold);
}

function rebuildAvatarSheet() {
  var a = apiGetAvatar();
  var sh = sheet(SH.AVATAR, true);
  sh.clearContents();

  var rows = [], bold = [];
  rows.push(['Графика (аватар)']); bold.push(rows.length);
  rows.push(['Обновлено: ' + Utilities.formatDate(new Date(), getTimezone(), 'dd.MM.yyyy HH:mm')]);
  rows.push([]);
  rows.push(['Текущая стадия', a.stage ? a.stage.name : '—']);
  rows.push(['Индекс стадии', a.currentStageIndex]);
  rows.push(['Файл SVG', a.stage ? a.stage.svgFile : '']);
  rows.push(['Описание', a.stage ? a.stage.description : '']);
  rows.push(['Лучший текущий стрик', a.bestCurrentStreak]);
  rows.push(['Следующая стадия', a.nextStage ? a.nextStage.name : 'Максимальная стадия достигнута']);
  rows.push(['Дней до следующей стадии', a.daysToNextStage === null ? '—' : a.daysToNextStage]);
  rows.push([]);
  rows.push(['Все стадии']); bold.push(rows.length);
  rows.push(['#', 'Название', 'Порог (дней)', 'Файл SVG', 'Описание']); bold.push(rows.length);
  getAvatarStages_().forEach(function (s) {
    rows.push([s.stageIndex, s.name, s.thresholdDays, s.svgFile, s.description]);
  });

  writeSheetRows_(sh, rows, bold);
}

function rebuildProfileSheet() {
  var p = apiGetProfile();
  var sh = sheet(SH.PROFILE, true);
  sh.clearContents();

  var rows = [], bold = [];
  rows.push(['Профиль']); bold.push(rows.length);
  rows.push(['Обновлено: ' + Utilities.formatDate(new Date(), getTimezone(), 'dd.MM.yyyy HH:mm')]);
  rows.push([]);
  rows.push(['Имя пользователя', p.settings.userName || '—']);
  rows.push(['Часовой пояс', p.settings.timezone || CFG.TIMEZONE]);
  rows.push([]);
  rows.push(['Итоги']); bold.push(rows.length);
  rows.push(['Всего привычек', p.totals.totalHabits]);
  rows.push(['Лучший стрик за всё время', p.totals.bestStreakEver]);
  rows.push(['Лучший текущий стрик', p.totals.bestCurrentStreak]);
  rows.push(['Наград получено', p.totals.achievementsUnlocked + ' / ' + p.totals.achievementsTotal]);
  rows.push([]);
  rows.push(['Награды (бейджи)']); bold.push(rows.length);
  rows.push(['Иконка', 'Название', 'Статус']); bold.push(rows.length);
  p.achievements.forEach(function (a) { rows.push([a.icon, a.title, a.unlocked ? 'Получено' : 'В процессе']); });

  writeSheetRows_(sh, rows, bold);
}

function rebuildCalendarSheet() {
  var data = apiGetCalendar({});
  var sh = sheet(SH.CALENDAR, true);
  sh.clearContents();

  var rows = [], bold = [];
  rows.push(['Календарь — ' + data.month]); bold.push(rows.length);
  rows.push(['Обновлено: ' + Utilities.formatDate(new Date(), getTimezone(), 'dd.MM.yyyy HH:mm')]);
  rows.push([]);
  rows.push(['Дата', 'Статус дня', 'Привычки']); bold.push(rows.length);
  data.days.forEach(function (d) {
    var habitsStr = d.habits.map(function (h) { return h.name + ' (' + statusRu_(h.status) + ')'; }).join(', ');
    rows.push([d.date, statusRu_(d.status), habitsStr]);
  });

  writeSheetRows_(sh, rows, bold);
}

// ═══════════════════════════════════════════════════════════════════════════
// ФАЙЛ: 08_ui.gs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Трекер привычек — файл 8/8: меню редактора таблицы.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Трекер привычек')
    .addItem('Настроить таблицу', 'setupWorkbook')
    .addItem('Пересобрать листы', 'rebuildAllViews')
    .addItem('Установить триггер напоминаний', 'installReminderTrigger')
    .addItem('Проверить FCM токен', 'testFcmAuth')
    .addItem('Показать мой токен API', 'showApiToken')
    .addToUi();
}

/** Проверка настройки FCM: пытается получить access token сервисного аккаунта. */
function testFcmAuth() {
  try {
    getFcmAccessToken();
    SpreadsheetApp.getUi().alert('FCM настроен верно — access token успешно получен.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Ошибка FCM: ' + e.message);
  }
}

/** Показывает текущий токен API и напоминание про URL Web App — для config.js фронтенда. */
function showApiToken() {
  var token = getAuthToken();
  var url = ScriptApp.getService().getUrl();
  var msg = 'Токен API:\n' + token + '\n\n'
    + 'URL веб-приложения:\n' + (url || '(опубликуйте Web App через «Развернуть» → «Новое развёртывание», чтобы получить URL)')
    + '\n\nСкопируйте оба значения в config.js фронтенда.';
  SpreadsheetApp.getUi().alert(msg);
}
