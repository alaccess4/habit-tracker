import { icon } from '../icons.js';

// achievements: [{id,title,description,icon,unlocked,unlockedAt,progress:{current,threshold}}]
export function renderBadgeGrid(achievements) {
  if (!achievements || !achievements.length) {
    return `<p class="empty-state">Пока нет наград — начните отмечать привычки, и здесь появятся первые бейджи.</p>`;
  }
  return `
    <div class="badge-grid">
      ${achievements
        .map((a) => {
          const pct = a.progress && a.progress.threshold ? Math.min(1, a.progress.current / a.progress.threshold) : a.unlocked ? 1 : 0;
          return `
          <div class="badge ${a.unlocked ? 'is-unlocked' : 'is-locked'}" title="${escapeHtml(a.description || '')}">
            <div class="badge__icon">${icon(a.unlocked ? a.icon : 'lock', { size: 26 })}</div>
            <span class="badge__title">${escapeHtml(a.title)}</span>
            ${
              !a.unlocked && a.progress
                ? `<div class="badge__progress"><div class="progress-bar progress-bar--thin"><span style="width:${Math.round(pct * 100)}%"></span></div></div>`
                : ''
            }
          </div>`;
        })
        .join('')}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
