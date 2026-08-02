/**
 * Трекер привычек — файл 8/8: меню редактора таблицы.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Трекер привычек')
    .addItem('Настроить таблицу', 'setupWorkbook')
    .addItem('Пересобрать листы', 'rebuildAllViews')
    .addItem('Установить триггер напоминаний', 'installReminderTrigger')
    .addItem('Проверить FCM токен', 'testFcmAuth')
    .addItem('Показать мой токен API', 'showApiToken')
    .addToUi();
}

/** Проверка настройки FCM: пытается получить access token сервисного аккаунта. */
function testFcmAuth() {
  try {
    getFcmAccessToken();
    SpreadsheetApp.getUi().alert('FCM настроен верно — access token успешно получен.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Ошибка FCM: ' + e.message);
  }
}

/** Показывает текущий токен API и напоминание про URL Web App — для config.js фронтенда. */
function showApiToken() {
  var token = getAuthToken();
  var url = ScriptApp.getService().getUrl();
  var msg = 'Токен API:\n' + token + '\n\n'
    + 'URL веб-приложения:\n' + (url || '(опубликуйте Web App через «Развернуть» → «Новое развёртывание», чтобы получить URL)')
    + '\n\nСкопируйте оба значения в config.js фронтенда.';
  SpreadsheetApp.getUi().alert(msg);
}
