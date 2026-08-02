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
