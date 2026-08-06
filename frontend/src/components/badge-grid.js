import { icon } from '../icons.js';

// achievements: [{id,title,description,icon,unlocked,progress:{current,threshold,percent}}]
export function renderBadgeGrid(achievements) {
  if (!achievements || !achievements.length) {
    return `<p class="empty-state">Пока нет наград — начните отмечать привычки, и здесь появятся первые бейджи.</p>`;
  }
  return `
    <div class="badge-grid">
      ${achievements
        .map(
          (a) => `
        <div class="badge ${a.unlocked ? 'is-unlocked' : 'is-locked'}" title="${escapeHtml(a.description || '')}">
          <div class="badge__icon">
            ${icon(a.icon || 'trophy', { size: 32 })}
            <span class="badge__lock">${icon('lock', { size: 12 })}</span>
          </div>
          <span class="badge__name">${escapeHtml(a.title)}</span>
        </div>`
        )
        .join('')}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
