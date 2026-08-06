import { icon, habitIconImg } from '../icons.js';

// today = { habitId, value, completed, scheduled, deadlineCountdownMinutes } | null
export function renderHabitCard(habit, today) {
  const value = today ? today.value || 0 : 0;
  const completed = today ? !!today.completed : false;
  const isCount = habit.targetType === 'count';
  const target = habit.dailyTarget || 1;
  const percent = isCount ? Math.min(1, value / target) : completed ? 1 : 0;
  const deadlineChip = habit.deadlineTime
    ? `<span class="chip ${completed ? 'chip--success' : 'chip--warning'}">${icon('clock', { size: 14 })} до ${habit.deadlineTime}</span>`
    : '';

  return `
    <article class="habit-card" data-habit-id="${habit.id}">
      <div class="habit-card__icon">${habitIconImg(habit.icon, { alt: habit.name })}</div>
      <div class="habit-card__body">
        <span class="habit-card__name">${escapeHtml(habit.name)}</span>
        <div class="habit-card__meta">
          ${deadlineChip}
          ${isCount ? `<span class="chip">${value}/${target} ${escapeHtml(habit.unit || '')}</span>` : ''}
        </div>
        <div class="habit-card__bar-track"><div class="habit-card__bar-fill" style="--progress:${percent}"></div></div>
      </div>
      <button
        class="habit-card__toggle ${isCount ? 'habit-card__toggle--static' : ''} ${completed ? 'is-checked' : ''}"
        data-action="${isCount ? 'increment' : 'toggle'}"
        aria-pressed="${completed}"
        aria-label="${isCount ? 'Добавить ' + escapeHtml(habit.unit || '') : 'Отметить выполнено'}"
      >
        ${icon(isCount ? 'plus' : 'check', { size: 20 })}
      </button>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
