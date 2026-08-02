import { api } from '../api.js';
import { icon } from '../icons.js';
import { setLoading, setError } from '../state.js';

export async function renderProgress(container) {
  container.innerHTML = `<div class="screen-loading">${icon('flame', { size: 28 })}<p>Загружаем прогресс…</p></div>`;
  setLoading(true);
  try {
    const [avatar, stats] = await Promise.all([api.getAvatar(), api.getStats()]);
    setLoading(false);
    paint(container, avatar, stats);
  } catch (err) {
    setLoading(false);
    setError(err);
    container.innerHTML = `<div class="screen-error"><p>${escapeHtml(err.message)}</p><button class="button button--secondary" data-retry>Повторить</button></div>`;
    container.querySelector('[data-retry]')?.addEventListener('click', () => renderProgress(container));
  }
}

function paint(container, avatar, stats) {
  const stage = avatar.stage || {};
  const avatarSrc = `assets/avatar/${stage.svgFile || 'stage-01.png'}`;

  container.innerHTML = `
    <div class="screen screen--progress">
      <header class="screen-header">
        <div>
          <p class="screen-header__eyebrow">Прогресс</p>
          <h1>${escapeHtml(stage.name || 'Скелет')}</h1>
        </div>
      </header>

      <section class="avatar-stage">
        <img src="${avatarSrc}" alt="${escapeHtml(stage.name || '')}" width="220" height="220" />
        <p class="avatar-stage__caption">${escapeHtml(stage.description || '')}</p>
        <div class="avatar-stage__streak">
          ${icon('flame', { size: 18 })}
          <span>${avatar.bestCurrentStreak} ${dayWord(avatar.bestCurrentStreak)} подряд</span>
        </div>
        ${
          avatar.nextStage
            ? `<p class="avatar-stage__next">До «${escapeHtml(avatar.nextStage.name)}»: ещё ${avatar.daysToNextStage} ${dayWord(avatar.daysToNextStage)}</p>`
            : `<p class="avatar-stage__next">Максимальная стадия достигнута — держите стрик, чтобы не откатиться!</p>`
        }
      </section>

      <section>
        <h2 class="section-title">Стрики по привычкам</h2>
        <div class="streak-list">
          ${
            stats.habitStreaks && stats.habitStreaks.length
              ? stats.habitStreaks
                  .map(
                    (h) => `
                <div class="streak-row">
                  <span>${escapeHtml(h.name)}</span>
                  <span class="streak-row__value">${icon('flame', { size: 14 })} ${h.current}</span>
                </div>`
                  )
                  .join('')
              : `<p class="empty-state">Пока нет данных — добавьте привычки на Главной.</p>`
          }
        </div>
      </section>
    </div>
  `;
}

function dayWord(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return 'дней';
  if (m10 === 1) return 'день';
  if (m10 >= 2 && m10 <= 4) return 'дня';
  return 'дней';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
