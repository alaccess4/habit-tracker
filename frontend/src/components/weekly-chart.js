// tabs: [{key,label}], activeTab: key, series: [{label,value}], todayIndex: highlight last bar
export function renderWeeklyChart({ tabs = [], activeTab = '', series = [], maxValue = null, todayIndex = series.length - 1 }) {
  const max = maxValue || Math.max(1, ...series.map((s) => s.value));
  return `
    <div class="weekly-chart">
      ${
        tabs.length
          ? `<div class="weekly-chart__tabs" role="tablist">
              ${tabs
                .map(
                  (t) => `<button class="weekly-chart__tab ${t.key === activeTab ? 'is-active' : ''}" data-chart-tab="${t.key}" role="tab" aria-selected="${t.key === activeTab}">${t.label}</button>`
                )
                .join('')}
            </div>`
          : ''
      }
      <div class="weekly-chart__bars">
        ${series
          .map(
            (s, i) => `
          <div class="weekly-chart__bar-col ${i === todayIndex ? 'is-today' : ''}">
            <div class="weekly-chart__bar" style="--value:${Math.max(0.03, s.value / max)}" title="${s.label}: ${s.value}"></div>
            <span class="weekly-chart__bar-label">${s.label}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>
  `;
}
