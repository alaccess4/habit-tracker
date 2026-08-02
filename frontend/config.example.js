// Скопируйте этот файл в config.js (он в .gitignore — реальные значения не попадут в git)
// и заполните своими данными после установки Apps Script и Firebase (см. УСТАНОВКА.md).

// self работает и в обычной странице, и в service worker (firebase-messaging-sw.js),
// а window — только в странице, поэтому используем self.
self.APP_CONFIG = {
  // URL вашего задеплоенного Apps Script Web App, вида:
  // https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

  // Токен авторизации — берётся в Google Sheet через меню
  // "Трекер привычек → Показать мой токен API" после запуска setupWorkbook().
  AUTH_TOKEN: 'YOUR_AUTH_TOKEN',

  // Firebase Web-конфиг из консоли Firebase (Project settings → General → Your apps → Web app).
  // Нужен только для push-уведомлений (Фаза 4) — если ещё не настраивали Firebase,
  // можно оставить как есть, приложение будет работать без push.
  FIREBASE_CONFIG: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },

  // VAPID public key для Web Push (Firebase → Cloud Messaging → Web Push certificates).
  FIREBASE_VAPID_KEY: ''
};
