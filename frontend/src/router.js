// Простой hash-роутер: #/dashboard, #/calendar, #/rewards, #/progress, #/profile
// Хэш-навигация даёт нормальные deep links и работу кнопки "назад" без сервера/бандлера.

import { store } from './state.js';

const ROUTES = ['dashboard', 'calendar', 'rewards', 'progress', 'profile'];
const DEFAULT_ROUTE = 'dashboard';

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  return ROUTES.includes(raw) ? raw : DEFAULT_ROUTE;
}

export function initRouter(onChange) {
  const apply = () => {
    const route = parseHash();
    store.set({ route });
    onChange(route);
  };
  window.addEventListener('hashchange', apply);
  if (!window.location.hash) {
    window.location.hash = `#/${DEFAULT_ROUTE}`;
  }
  apply();
}

export function navigate(route) {
  if (!ROUTES.includes(route)) return;
  window.location.hash = `#/${route}`;
}

export { ROUTES };
