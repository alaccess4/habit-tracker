// Небольшой набор line-иконок (24x24, stroke=currentColor), чтобы не тянуть внешнюю
// библиотеку без шага сборки. Используются в навигации, бейджах наград и статусах.

const PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 5.5H4.5A2.5 2.5 0 0 0 5 10.4M17 5.5h2.5A2.5 2.5 0 0 1 19 10.4"/><path d="M12 14v3M9 20.5h6M9.5 20.5c0-2 .8-3 2.5-3s2.5 1 2.5 3"/>',
  flame: '<path d="M12 3s4 3.5 4 8a4 4 0 0 1-8 0c0-1.2.6-2 1.2-2.7C9.7 9 10.5 10 10.5 11c0-3-1.5-4.5-1.5-6.5C9 3 12 3 12 3Z"/><path d="M12 21a5 5 0 0 0 5-5c0-1.8-.9-3-2-4"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8"/>',
  check: '<path d="M5 12.5 9.5 17 19 7"/>',
  'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5 11 15l5-6"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  bell: '<path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0"/>',
  star: '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7Z"/>',
  medal: '<circle cx="12" cy="14.5" r="6"/><path d="M9.5 9 7 3.5h2.4L12 8l2.6-4.5H17L14.5 9"/><path d="M12 12v5"/>',
  footprints: '<ellipse cx="9" cy="8" rx="2.3" ry="3.2" transform="rotate(-15 9 8)"/><ellipse cx="16" cy="15" rx="2.3" ry="3.2" transform="rotate(15 16 15)"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
  crown: '<path d="M4 9l3.5 3L12 6l4.5 6L20 9l-1.5 8h-13L4 9Z"/>',
  sparkles: '<path d="M12 3v4M12 17v4M4 12h4M16 12h4"/><path d="M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2"/>',
  'chevron-left': '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
  'chevron-right': '<path d="M9 5.5 15.5 12 9 18.5"/>',
  edit: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4Z"/>',
  trash: '<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/>'
};

export function icon(name, { size = 22, className = '' } = {}) {
  const body = PATHS[name] || PATHS.generic || PATHS['check-circle'];
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const HABIT_ICON_FILES = {
  pushups: 'assets/habit-icons/pushups.svg',
  reading: 'assets/habit-icons/reading.svg',
  stretching: 'assets/habit-icons/stretching.svg',
  water: 'assets/habit-icons/water.svg',
  steps: 'assets/habit-icons/steps.svg',
  sleep: 'assets/habit-icons/sleep.svg',
  meditation: 'assets/habit-icons/meditation.svg',
  generic: 'assets/habit-icons/generic.svg'
};

export function habitIconImg(habitIconKey, { size = 26, alt = '' } = {}) {
  const src = HABIT_ICON_FILES[habitIconKey] || HABIT_ICON_FILES.generic;
  return `<img class="habit-icon-img" src="${src}" width="${size}" height="${size}" alt="${alt}" />`;
}
