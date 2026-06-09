/**
 * Бесплатный API для формы на GitHub Pages.
 * 1. Откройте https://script.google.com → Новый проект
 * 2. Вставьте этот код
 * 3. Запустите setupSecrets (один раз) — подставьте токен и chat_id
 * 4. Развернуть → Новое развертывание → Веб-приложение
 *    - Запуск от имени: Я
 *    - Доступ: Все
 * 5. Скопируйте URL и вставьте в form-config.js → formApiUrl
 */

function setupSecrets() {
  // Замените значения на свои перед первым запуском:
  PropertiesService.getScriptProperties().setProperties({
    BOT_TOKEN: 'ВАШ_ТОКЕН_ОТ_BOTFATHER',
    CHAT_ID: '5232226311',
    BOT_USERNAME: 'zayavka_sveta_bot',
  });
}

function doPost(e) {
  return handleRequest_(e);
}

function doGet(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var botToken = props.getProperty('BOT_TOKEN');
    var chatId = props.getProperty('CHAT_ID');
    var botUsername = props.getProperty('BOT_USERNAME') || 'zayavka_sveta_bot';

    if (!botToken || !chatId) {
      return jsonResponse_({ ok: false, error: 'Сначала запустите setupSecrets() в редакторе скрипта' }, 500);
    }

    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    }

    var error = validate_(data);
    if (error) {
      return jsonResponse_({ ok: false, error: error }, 400);
    }

    var text = buildMessage_(data);
    var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: text }),
      muteHttpExceptions: true,
    });

    var result = JSON.parse(response.getContentText() || '{}');
    if (!result.ok) {
      var apiError = result.description || 'Неизвестная ошибка Telegram';
      if (/can't initiate conversation/i.test(apiError)) {
        apiError =
          'Сначала напишите боту @' +
          botUsername +
          ' команду /start в Telegram, затем отправьте заявку снова.';
      }
      return jsonResponse_({ ok: false, error: apiError }, 400);
    }

    return jsonResponse_({ ok: true }, 200);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err.message || err) }, 500);
  }
}

function validate_(data) {
  var name = String(data.name || '').trim();
  var contactType = data.contact_type || 'phone';
  var phone = String(data.phone || '').trim();
  var email = String(data.email || '').trim();
  var consent = Boolean(data.consent);

  if (!name) return 'Укажите имя';
  if (!consent) return 'Необходимо согласие на обработку персональных данных';

  if (contactType === 'email') {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Укажите корректный email';
    }
  } else if (!phone) {
    return 'Укажите телефон';
  }

  return null;
}

function buildMessage_(data) {
  var name = String(data.name || '').trim();
  var contactType = data.contact_type || 'phone';
  var phone = String(data.phone || '').trim();
  var email = String(data.email || '').trim();
  var service = String(data.service || '').trim();
  var message = String(data.message || '').trim();

  var contactLine =
    contactType === 'email' ? '📧 Email: ' + email : '📱 Телефон: ' + phone;

  var lines = ['🆕 Новая заявка с сайта', '', '👤 Имя: ' + name, contactLine];

  if (service) lines.push('🛠 Услуга: ' + service);
  if (message) lines.push('💬 Комментарий: ' + message);
  lines.push('', '✅ Согласие на обработку персональных данных: да');

  return lines.join('\n');
}

function jsonResponse_(body, status) {
  var output = ContentService.createTextOutput(JSON.stringify(body));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
