import { api } from '../api.js';
import { renderBadgeGrid } from '../components/badge-grid.js';
import { openModal, closeModal } from '../components/modal.js';
import { icon } from '../icons.js';
import { setLoading, setError } from '../state.js';

export async function renderRewards(container) {
  container.innerHTML = `<div class="screen-loading">${icon('trophy', { size: 28 })}<p>Загружаем награды…</p></div>`;
  setLoading(true);
  try {
    const [achievements, goals, habits] = await Promise.all([api.getAchievements(), api.getGoals(), api.getHabits()]);
    setLoading(false);
    paint(container, achievements, goals, habits);
  } catch (err) {
    setLoading(false);
    setError(err);
    container.innerHTML = `<div class="screen-error"><p>${escapeHtml(err.message)}</p><button class="button button--secondary" data-retry>Повторить</button></div>`;
    container.querySelector('[data-retry]')?.addEventListener('click', () => renderRewards(container));
  }
}

function paint(container, achievements, goals, habits) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  container.innerHTML = `
    <div class="screen screen--rewards">
      <header class="screen-header">
        <div>
          <p class="screen-header__eyebrow">Награды</p>
          <h1>${unlockedCount} из ${achievements.length}</h1>
        </div>
      </header>

      <section>
        <h2 class="section-title">Бейджи</h2>
        ${renderBadgeGrid(achievements)}
      </section>

      <section>
        <div class="section-title-row">
          <h2 class="section-title">Долгосрочные цели</h2>
          <button class="icon-button" data-action="add-goal" aria-label="Новая цель">${icon('plus', { size: 18 })}</button>
        </div>
        <div id="goals-list">${renderGoals(goals)}</div>
      </section>
    </div>
  `;

  container.querySelector('[data-action="add-goal"]').addEventListener('click', () => openAddGoalModal(container, habits));
}

function renderGoals(goals) {
  if (!goals || !goals.length) {
    return `<p class="empty-state">Нет активных целей. Например: «Отжимания каждый день 30 дней».</p>`;
  }
  return `
    <div class="goal-list">
      ${goals
        .map((g) => {
          const pct = g.percent != null ? Math.min(1, g.percent) : 0;
          return `
          <div class="goal-card goal-card--${g.status || 'active'}">
            <div class="goal-card__top">
              <strong>${escapeHtml(g.title)}</strong>
              <span class="chip">${statusLabel(g.status)}</span>
            </div>
            <div class="progress-bar"><span style="width:${Math.round(pct * 100)}%"></span></div>
            <span class="goal-card__meta">${g.doneCount || 0}/${g.targetDays} дней · до ${formatDate(g.endDate)}</span>
          </div>`;
        })
        .join('')}
    </div>
  `;
}

function statusLabel(status) {
  return { active: 'В процессе', completed: 'Выполнено', failed: 'Не успели' }[status] || 'В процессе';
}

function openAddGoalModal(container, habits) {
  const habitOptions = habits.map((h) => `<option value="${h.id}">${escapeHtml(h.name)}</option>`).join('');
  openModal({
    title: 'Новая цель',
    bodyHtml: `
      <form id="add-goal-form" class="form">
        <label class="field">
          <span>Привычка</span>
          <select name="habitId" required>${habitOptions || '<option value="">Сначала добавьте привычку</option>'}</select>
        </label>
        <label class="field">
          <span>Название цели</span>
          <input type="text" name="title" required maxlength="80" placeholder="Например, 30 дней подряд" />
        </label>
        <label class="field">
          <span>Сколько дней</span>
          <input type="number" name="targetDays" min="1" value="30" required />
        </label>
        <label class="field">
          <span>Дедлайн</span>
          <input type="date" name="endDate" required />
        </label>
        <button class="button button--primary" type="submit" ${habits.length ? '' : 'disabled'}>Создать</button>
      </form>
    `,
    onMount: (root) => {
      const form = root.querySelector('#add-goal-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        try {
          await api.createGoal({
            habitId: fd.get('habitId'),
            title: fd.get('title'),
            targetDays: Number(fd.get('targetDays')),
            startDate: todayIso(),
            endDate: fd.get('endDate')
          });
          closeModal();
          renderRewards(container);
        } catch (err) {
          alert('Не удалось создать цель: ' + err.message);
        }
      });
    }
  });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
