import { icon } from '../icons.js';

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-root');
  }
  return container;
}

export function showToast({ title, body = '', iconName = 'sparkles', duration = 4000 }) {
  const root = ensureContainer();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast__icon">${icon(iconName, { size: 20 })}</div>
    <div>
      <div class="toast__title">${escapeHtml(title)}</div>
      ${body ? `<div class="toast__body">${escapeHtml(body)}</div>` : ''}
    </div>
  `;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 250);
  }, duration);
}

export function showAchievementUnlocked(achievement) {
  showToast({
    title: 'Новая награда!',
    body: achievement.title,
    iconName: achievement.icon || 'trophy',
    duration: 5000
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
