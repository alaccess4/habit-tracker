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
