// Круговой прогресс-индикатор на чистом SVG (stroke-dasharray/dashoffset).
export function renderProgressRing({ percent = 0, size = 120, stroke = 12, centerHtml = '' }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, percent));
  const offset = circumference * (1 - clamped);
  const cx = size / 2;
  const cy = size / 2;
  return `
    <div class="progress-ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--color-accent-start)" />
            <stop offset="100%" stop-color="var(--color-accent-end)" />
          </linearGradient>
        </defs>
        <circle class="progress-ring__track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${stroke}" fill="none" />
        <circle
          class="progress-ring__value"
          cx="${cx}" cy="${cy}" r="${r}"
          stroke-width="${stroke}"
          fill="none"
          stroke="url(#ringGradient)"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 ${cx} ${cy})"
        />
      </svg>
      <div class="progress-ring__center">${centerHtml}</div>
    </div>
  `;
}
