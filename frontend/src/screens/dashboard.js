import { api } from '../api.js';
import { renderProgressRing } from '../components/progress-ring.js';
import { renderHabitCard } from '../components/habit-card.js';
import { renderWeeklyChart } from '../components/weekly-chart.js';
import { openModal, closeModal } from '../components/modal.js';
import { showAchievementUnlocked } from '../components/toast.js';
import { icon, HABIT_ICON_FILES } from '../icons.js';
import { setLoading, setError } from '../state.js';

let statsChartTab = 'completed';

export async function renderDashboard(container) {
  container.innerHTML = `<div class="screen-loading">${icon('flame', { size: 28 })}<p>Загружаем сегодняшний день…</p></div>`;
  setLoading(true);
  try {
    const [today, stats] = await Promise.all([api.getToday(), api.getStats()]);
    setLoading(false);
    paint(container, today, stats);
  } catch (err) {
    setLoading(false);
    setError(err);
    container.innerHTML = errorBlock(err);
    container.querySelector('[data-retry]')?.addEventListener('click', () => renderDashboard(container));
  }
}

function paint(container, today, stats) {
  const percent = today.totalScheduledToday ? today.completedCount / today.totalScheduledToday : 0;

  container.innerHTML = `
    <div class="screen screen--dashboard">
      <header class="screen-header">
        <div>
          <p class="screen-header__eyebrow">Сегодня</p>
          <h1>${greeting()}</h1>
        </div>
        <button class="icon-button" data-action="add-habit" aria-label="Добавить привычку">${icon('plus', { size: 20 })}</button>
      </header>

      <section class="hero-card">
        <div class="hero-card__text">
          <p class="hero-card__caption">Выполнено сегодня</p>
          <p class="hero-card__big">${today.completedCount}/${today.totalScheduledToday}</p>
          <p class="hero-card__hint">Так держать — привычки строятся день за днём</p>
        </div>
        ${renderProgressRing({
          percent,
          size: 96,
          stroke: 10,
          centerHtml: `<strong>${Math.round(percent * 100)}%</strong>`
        })}
        <div class="hero-card__streak">
          ${icon('flame', { size: 18 })}
          <span>${today.bestCurrentStreak} ${dayWord(today.bestCurrentStreak)} подряд</span>
        </div>
      </section>

      <section class="habit-list" id="habit-list">
        <h2 class="section-title">Привычки</h2>
        <div id="habit-list-items"></div>
      </section>

      <section>
        <h2 class="section-title">Активность за неделю</h2>
        <div id="weekly-chart-slot"></div>
      </section>
    </div>
  `;

  renderHabitList(container, today);
  renderChart(container, stats);

  container.querySelector('[data-action="add-habit"]').addEventListener('click', () => openAddHabitModal(container));
}

function renderHabitList(container, today) {
  const slot = container.querySelector('#habit-list-items');
  if (!today.habits || !today.habits.length) {
    slot.innerHTML = `<p class="empty-state">Привычек пока нет. Нажмите «+», чтобы добавить первую — например, отжимания или чтение.</p>`;
    return;
  }
  slot.innerHTML = today.habits.map((h) => renderHabitCard(h.habit, h)).join('');
  slot.querySelectorAll('.habit-card').forEach((card) => {
    const habitId = card.dataset.habitId;
    const entry = today.habits.find((h) => h.habit.id === habitId);
    const btn = card.querySelector('[data-action]');
    btn.addEventListener('click', () => handleLog(container, entry.habit, entry, btn));
  });
}

async function handleLog(container, habit, entry, btn) {
  btn.disabled = true;
  const isCount = habit.targetType === 'count';
  let value;
  if (isCount) {
    value = (entry.value || 0) + 1;
  } else {
    value = entry.completed ? 0 : 1;
  }
  try {
    const result = await api.logEntry({ habitId: habit.id, value });
    if (result.achievementsUnlocked && result.achievementsUnlocked.length) {
      result.achievementsUnlocked.forEach((a) => showAchievementUnlocked(a));
    }
    await renderDashboard(container);
  } catch (err) {
    setError(err);
    btn.disabled = false;
    alert('Не удалось сохранить: ' + err.message);
  }
}

function renderChart(container, stats) {
  const slot = container.querySelector('#weekly-chart-slot');
  const series =
    statsChartTab === 'completed'
      ? stats.last7Days.map((d) => ({ label: d.weekday, value: d.completedCount }))
      : stats.last7Days.map((d) => ({ label: d.weekday, value: Math.round((d.completionRate || 0) * 100) }));

  slot.innerHTML = renderWeeklyChart({
    tabs: [
      { key: 'completed', label: 'Выполнено' },
      { key: 'rate', label: '% дня' }
    ],
    activeTab: statsChartTab,
    series
  });

  slot.querySelectorAll('[data-chart-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      statsChartTab = btn.dataset.chartTab;
      renderChart(container, stats);
    });
  });
}

function openAddHabitModal(container) {
  const iconOptions = Object.keys(HABIT_ICON_FILES)
    .map((k) => `<option value="${k}">${k}</option>`)
    .join('');
  openModal({
    title: 'Новая привычка',
    bodyHtml: `
      <form id="add-habit-form" class="form">
        <label class="field">
          <span>Название</span>
          <input type="text" name="name" required maxlength="60" placeholder="Например, Отжимания" />
        </label>
        <label class="field">
          <span>Иконка</span>
          <select name="icon">${iconOptions}</select>
        </label>
        <label class="field">
          <span>Тип</span>
          <select name="targetType">
            <option value="boolean">Да/нет (отметка)</option>
            <option value="count">Число (с целью в день)</option>
          </select>
        </label>
        <label class="field" data-only-count>
          <span>Цель в день</span>
          <input type="number" name="dailyTarget" min="1" value="20" />
        </label>
        <label class="field" data-only-count>
          <span>Единица</span>
          <input type="text" name="unit" placeholder="раз, страниц, стаканов…" maxlength="20" />
        </label>
        <label class="field">
          <span>Дедлайн (необязательно)</span>
          <input type="time" name="deadlineTime" />
        </label>
        <button class="button button--primary" type="submit">Добавить</button>
      </form>
    `,
    onMount: (root) => {
      const form = root.querySelector('#add-habit-form');
      const typeSelect = form.querySelector('[name="targetType"]');
      const countFields = root.querySelectorAll('[data-only-count]');
      const syncType = () => {
        const isCount = typeSelect.value === 'count';
        countFields.forEach((f) => (f.style.display = isCount ? '' : 'none'));
      };
      typeSelect.addEventListener('change', syncType);
      syncType();

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const targetType = fd.get('targetType');
        const payload = {
          name: fd.get('name'),
          icon: fd.get('icon'),
          targetType,
          dailyTarget: targetType === 'count' ? Number(fd.get('dailyTarget') || 1) : 1,
          unit: targetType === 'count' ? fd.get('unit') : '',
          scheduleType: 'daily',
          scheduleDays: [1, 2, 3, 4, 5, 6, 7],
          deadlineTime: fd.get('deadlineTime') || null
        };
        try {
          await api.createHabit(payload);
          closeModal();
          renderDashboard(container);
        } catch (err) {
          alert('Не удалось создать привычку: ' + err.message);
        }
      });
    }
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function dayWord(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return 'дней';
  if (m10 === 1) return 'день';
  if (m10 >= 2 && m10 <= 4) return 'дня';
  return 'дней';
}

function errorBlock(err) {
  return `
    <div class="screen-error">
      <p>Не удалось загрузить данные.</p>
      <p class="screen-error__detail">${escapeHtml(err.message)}</p>
      <button class="button button--secondary" data-retry>Повторить</button>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
