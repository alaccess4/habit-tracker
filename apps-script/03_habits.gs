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

  markViewsDirty_();
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
  markViewsDirty_();
  return getHabitById_(payload.id);
}

function apiDeleteHabit(payload) {
  payload = payload || {};
  if (!payload.id) throw new Error('id is required');
  var rowIx = findRowIndexById(SH.HABITS, 'id', payload.id);
  if (rowIx === -1) throw new Error('habit not found: ' + payload.id);

  // Мягкое удаление — никогда не удаляем строку физически, чтобы не потерять историю/стрики.
  updateRow(SH.HABITS, HIX, rowIx, { active: false });
  markViewsDirty_();
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
  markViewsDirty_();

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
