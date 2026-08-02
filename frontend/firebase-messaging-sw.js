// Service worker для фоновых push-уведомлений Firebase Cloud Messaging.
// Должен лежать в корне сайта — иначе scope не покроет всё приложение.
// config.js кладёт настройки в self.APP_CONFIG (не window — воркер не видит window).
importScripts('./config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const cfg = self.APP_CONFIG || {};

if (cfg.FIREBASE_CONFIG && cfg.FIREBASE_CONFIG.apiKey) {
  firebase.initializeApp(cfg.FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Трекер привычек';
    const body = (payload.notification && payload.notification.body) || '';
    self.registration.showNotification(title, {
      body,
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-192.png',
      data: payload.data || {}
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
