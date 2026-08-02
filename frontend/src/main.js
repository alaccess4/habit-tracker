import { initRouter } from './router.js';
import { renderBottomNav, attachBottomNav } from './components/bottom-nav.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderCalendar } from './screens/calendar.js';
import { renderRewards } from './screens/rewards.js';
import { renderProgress } from './screens/progress.js';
import { renderProfile } from './screens/profile.js';
import { tryRestorePush } from './firebase.js';

const SCREENS = {
  dashboard: renderDashboard,
  calendar: renderCalendar,
  rewards: renderRewards,
  progress: renderProgress,
  profile: renderProfile
};

const content = document.getElementById('app-content');
const navSlot = document.getElementById('bottom-nav-slot');

function renderNav(activeRoute) {
  navSlot.innerHTML = renderBottomNav(activeRoute);
  attachBottomNav(navSlot);
}

function renderScreen(route) {
  renderNav(route);
  const renderFn = SCREENS[route] || renderDashboard;
  renderFn(content);
}

initRouter(renderScreen);
tryRestorePush();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    // офлайн-кэш необязателен для работы приложения
  });
}
