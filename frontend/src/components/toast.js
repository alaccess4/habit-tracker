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
    <div class="toast__text">
      <strong>${escapeHtml(title)}</strong>
      ${body ? `<span>${escapeHtml(body)}</span>` : ''}
    </div>
  `;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 300);
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
