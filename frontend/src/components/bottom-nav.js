import { icon } from '../icons.js';
import { navigate } from '../router.js';

const ITEMS = [
  { route: 'dashboard', label: 'Главная', icon: 'home' },
  { route: 'calendar', label: 'Календарь', icon: 'calendar' },
  { route: 'rewards', label: 'Награды', icon: 'trophy' },
  { route: 'progress', label: 'Прогресс', icon: 'flame' },
  { route: 'profile', label: 'Профиль', icon: 'user' }
];

export function renderBottomNav(activeRoute) {
  return `
    <nav class="bottom-nav" aria-label="Основная навигация">
      ${ITEMS.map(
        (item) => `
        <button
          class="bottom-nav__item ${item.route === activeRoute ? 'is-active' : ''}"
          data-route="${item.route}"
          aria-current="${item.route === activeRoute ? 'page' : 'false'}"
        >
          ${icon(item.icon, { size: 22 })}
          <span>${item.label}</span>
        </button>`
      ).join('')}
    </nav>
  `;
}

export function attachBottomNav(container) {
  container.querySelectorAll('.bottom-nav__item').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });
}
