// Круговой прогресс-индикатор на чистом SVG (stroke-dasharray/dashoffset).
// Разметка и CSS-переменные (--progress, --ring-circumference) соответствуют
// контракту .progress-ring в src/styles/components.css.
let counter = 0;

export function renderProgressRing({ percent = 0, size = 160, stroke = 10, number = '', label = '' }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, percent));
  const cx = size / 2;
  const cy = size / 2;
  const gradientId = `progress-ring-gradient-${counter++}`;

  return `
    <div class="progress-ring" style="width:${size}px;height:${size}px;--progress:${clamped};--ring-circumference:${circumference}">
      <svg viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--color-accent-start)" />
            <stop offset="100%" stop-color="var(--color-accent-end)" />
          </linearGradient>
        </defs>
        <circle class="progress-ring__track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${stroke}" />
        <circle class="progress-ring__fill" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${stroke}" style="stroke:url(#${gradientId})" />
      </svg>
      <div class="progress-ring__content">
        ${number !== '' ? `<span class="progress-ring__number">${number}</span>` : ''}
        ${label ? `<span class="progress-ring__label">${label}</span>` : ''}
      </div>
    </div>
  `;
}
