import { icon, habitIconImg } from '../icons.js';

// today = { habitId, value, completed, deadlineMet, streak:{current,longestEver} } | null
export function renderHabitCard(habit, today) {
  const value = today ? today.value : 0;
  const completed = today ? today.completed : false;
  const isCount = habit.targetType === 'count';
  const target = habit.dailyTarget || 1;
  const percent = isCount ? Math.min(1, value / target) : completed ? 1 : 0;
  const deadlineChip = habit.deadlineTime
    ? `<span class="chip ${completed ? '' : 'chip--warning'}">${icon('clock', { size: 14 })} до ${habit.deadlineTime}</span>`
    : '';
  const lateChip =
    today && today.completed && today.deadlineMet === false
      ? `<span class="chip chip--danger">выполнено поздно</span>`
      : '';

  return `
    <article class="habit-card ${completed ? 'is-completed' : ''}" data-habit-id="${habit.id}">
      <div class="habit-card__icon">${habitIconImg(habit.icon, { alt: habit.name })}</div>
      <div class="habit-card__body">
        <div class="habit-card__top">
          <span class="habit-card__name">${escapeHtml(habit.name)}</span>
          ${deadlineChip}
          ${lateChip}
        </div>
        <div class="habit-card__progress">
          <div class="progress-bar"><span style="width:${Math.round(percent * 100)}%"></span></div>
          ${isCount ? `<span class="habit-card__value">${value}/${target} ${escapeHtml(habit.unit || '')}</span>` : ''}
        </div>
      </div>
      <div class="habit-card__action">
        ${
          isCount
            ? `<button class="icon-button" data-action="increment" aria-label="Добавить ${escapeHtml(habit.unit || '')}">${icon('plus', { size: 18 })}</button>`
            : `<button class="check-toggle ${completed ? 'is-checked' : ''}" data-action="toggle" aria-pressed="${completed}" aria-label="Отметить выполнено">${icon('check', { size: 18 })}</button>`
        }
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
