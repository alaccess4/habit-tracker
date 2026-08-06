import { api } from '../api.js';
import { renderBadgeGrid } from '../components/badge-grid.js';
import { icon } from '../icons.js';
import { setLoading, setError } from '../state.js';
import { enablePushNotifications, isPushSupported } from '../firebase.js';

export async function renderProfile(container) {
  container.innerHTML = `<div class="screen-loading">${icon('user', { size: 28 })}<p>Загружаем профиль…</p></div>`;
  setLoading(true);
  try {
    const profile = await api.getProfile();
    setLoading(false);
    paint(container, profile);
  } catch (err) {
    setLoading(false);
    setError(err);
    container.innerHTML = `<div class="screen-error"><p>${escapeHtml(err.message)}</p><button class="button button--secondary" data-retry>Повторить</button></div>`;
    container.querySelector('[data-retry]')?.addEventListener('click', () => renderProfile(container));
  }
}

function paint(container, profile) {
  const name = (profile.settings && profile.settings.userName) || 'Мой профиль';
  const pushSupported = isPushSupported();

  container.innerHTML = `
    <div class="screen profile-screen">
      <header class="screen-header screen-header--center">
        <div class="profile-avatar">${icon('user', { size: 34 })}</div>
        <h1 class="profile-screen__name">${escapeHtml(name)}</h1>
        <button class="link-button" data-action="edit-name">${icon('edit', { size: 14 })} изменить имя</button>
      </header>

      <section class="profile-stats">
        <div class="profile-stats__item">
          <strong>${profile.totalHabits ?? 0}</strong>
          <span>привычек</span>
        </div>
        <div class="profile-stats__item">
          <strong>${profile.bestStreakEver ?? 0}</strong>
          <span>лучший стрик</span>
        </div>
        <div class="profile-stats__item">
          <strong>${profile.unlockedAchievements ?? 0}/${profile.totalAchievements ?? 0}</strong>
          <span>наград</span>
        </div>
      </section>

      <section class="profile-screen__section">
        <div class="settings-row">
          <div>
            <strong>Push-уведомления</strong>
            <p class="settings-row__hint">${pushSupported ? 'Напоминания о привычках даже когда приложение закрыто' : 'Не поддерживается этим браузером/устройством'}</p>
          </div>
          <button class="button button--secondary" id="enable-push" ${pushSupported ? '' : 'disabled'}>Включить</button>
        </div>
      </section>

      <section class="profile-screen__section">
        <h2 class="section-title">Бейджи</h2>
        ${renderBadgeGrid(profile.achievements || [])}
      </section>
    </div>
  `;

  container.querySelector('#enable-push')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Подключаем…';
    try {
      await enablePushNotifications();
      e.target.textContent = 'Включено';
    } catch (err) {
      e.target.disabled = false;
      e.target.textContent = 'Включить';
      alert('Не удалось включить уведомления: ' + err.message);
    }
  });

  container.querySelector('[data-action="edit-name"]').addEventListener('click', async () => {
    const next = prompt('Как вас зовут?', name);
    if (next == null) return;
    try {
      await api.updateSettings({ userName: next });
      renderProfile(container);
    } catch (err) {
      alert('Не удалось сохранить: ' + err.message);
    }
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
