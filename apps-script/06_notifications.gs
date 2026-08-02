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
