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

  if (newlyUnlocked.length > 0) markViewsDirty_();

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
