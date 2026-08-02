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
