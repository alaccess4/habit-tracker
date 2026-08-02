import { api } from '../api.js';
import { icon } from '../icons.js';
import { setLoading, setError } from '../state.js';

let currentMonth = monthKey(new Date());

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export async function renderCalendar(container) {
  container.innerHTML = `<div class="screen-loading">${icon('calendar', { size: 28 })}<p>Загружаем календарь…</p></div>`;
  setLoading(true);
  try {
    const data = await api.getCalendar(currentMonth);
    setLoading(false);
    paint(container, data);
  } catch (err) {
    setLoading(false);
    setError(err);
    container.innerHTML = `<div class="screen-error"><p>${escapeHtml(err.message)}</p><button class="button button--secondary" data-retry>Повторить</button></div>`;
    container.querySelector('[data-retry]')?.addEventListener('click', () => renderCalendar(container));
  }
}

function paint(container, data) {
  const [y, m] = currentMonth.split('-').map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const leadingBlank = (firstOfMonth.getDay() + 6) % 7; // Monday-first offset

  const days = data.days || [];
  const dayCells = days.map((d) => renderDayCell(d)).join('');
  const blanks = Array.from({ length: leadingBlank }).map(() => `<div class="calendar-cell is-empty"></div>`).join('');

  container.innerHTML = `
    <div class="screen screen--calendar">
      <header class="screen-header">
        <div>
          <p class="screen-header__eyebrow">История</p>
          <h1>${MONTH_NAMES[m - 1]} ${y}</h1>
        </div>
      </header>

      <div class="calendar-nav">
        <button class="icon-button" data-nav="prev" aria-label="Предыдущий месяц">${icon('chevron-left', { size: 18 })}</button>
        <span class="calendar-nav__label">${MONTH_NAMES[m - 1]} ${y}</span>
        <button class="icon-button" data-nav="next" aria-label="Следующий месяц">${icon('chevron-right', { size: 18 })}</button>
      </div>

      <div class="calendar-legend">
        <span><i class="legend-dot legend-dot--full"></i>Всё выполнено</span>
        <span><i class="legend-dot legend-dot--partial"></i>Частично</span>
        <span><i class="legend-dot legend-dot--missed"></i>Пропущено</span>
      </div>

      <div class="calendar-grid calendar-grid--head">
        ${WEEKDAYS.map((w) => `<div class="calendar-weekday">${w}</div>`).join('')}
      </div>
      <div class="calendar-grid">
        ${blanks}
        ${dayCells}
      </div>

      <div id="day-detail" class="day-detail"></div>
    </div>
  `;

  container.querySelector('[data-nav="prev"]').addEventListener('click', () => shiftMonth(container, -1));
  container.querySelector('[data-nav="next"]').addEventListener('click', () => shiftMonth(container, 1));

  container.querySelectorAll('.calendar-cell[data-date]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const day = days.find((d) => d.date === cell.dataset.date);
      renderDayDetail(container, day);
    });
  });
}

function renderDayCell(day) {
  const dayNum = Number(day.date.split('-')[2]);
  const statusClass = `is-${day.status}`;
  return `
    <button class="calendar-cell ${statusClass}" data-date="${day.date}">
      <span class="calendar-cell__num">${dayNum}</span>
      ${day.status === 'full' ? icon('check', { size: 12, className: 'calendar-cell__mark' }) : ''}
    </button>
  `;
}

function renderDayDetail(container, day) {
  const slot = container.querySelector('#day-detail');
  if (!day) {
    slot.innerHTML = '';
    return;
  }
  const habits = day.habits || [];
  slot.innerHTML = `
    <h3>${formatDate(day.date)}</h3>
    ${
      habits.length
        ? `<ul class="day-detail__list">
            ${habits
              .map(
                (h) => `<li class="${h.completed ? 'is-done' : 'is-missed'}">${icon(h.completed ? 'check-circle' : 'close', { size: 16 })}<span>${escapeHtml(h.name)}</span></li>`
              )
              .join('')}
          </ul>`
        : `<p class="empty-state">В этот день не было запланированных привычек.</p>`
    }
  `;
}

function shiftMonth(container, delta) {
  const [y, m] = currentMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentMonth = monthKey(d);
  renderCalendar(container);
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1].toLowerCase()} ${y}`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
