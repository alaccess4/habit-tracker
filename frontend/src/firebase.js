// Push-уведомления через Firebase Cloud Messaging (веб).
// Подключается напрямую с CDN как ES-модуль — без npm и шага сборки.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getMessaging, getToken, isSupported } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';
import { api } from './api.js';

const cfg = window.APP_CONFIG || {};

export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'Notification' in window &&
    !!(cfg.FIREBASE_CONFIG && cfg.FIREBASE_CONFIG.apiKey) &&
    !!cfg.FIREBASE_VAPID_KEY
  );
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error('Push не настроен — заполните FIREBASE_CONFIG в frontend/config.js (см. УСТАНОВКА.md)');
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    throw new Error('Этот браузер не поддерживает push-уведомления (на iOS: добавьте приложение на главный экран)');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Разрешение на уведомления не выдано');
  }

  const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
  const app = initializeApp(cfg.FIREBASE_CONFIG);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: cfg.FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });
  if (!token) {
    throw new Error('Не удалось получить токен устройства');
  }

  await api.registerDevice({
    fcmToken: token,
    platform: 'web',
    label: (navigator.userAgent || 'web').slice(0, 60)
  });
  localStorage.setItem('push_enabled', '1');
  return token;
}

export async function tryRestorePush() {
  if (!isPushSupported()) return;
  if (localStorage.getItem('push_enabled') !== '1') return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    await enablePushNotifications();
  } catch (err) {
    // тихо — пользователь увидит статус на экране «Профиль»
    console.warn('Не удалось восстановить push:', err);
  }
}
