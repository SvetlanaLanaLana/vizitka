function setupSecrets() {
  PropertiesService.getScriptProperties().setProperties({
    BOT_TOKEN: '8568379396:AAE8zWrKYCrCd2cX7lt3Q3nvAjAmiIm1pic',
    CHAT_ID: '5232226311',
    BOT_USERNAME: 'zayavka_vizitka_bot',
  });
}

function doPost(e) {
  return respond_(processRequest_(e), e);
}

function doGet(e) {
  return respond_(processRequest_(e), e);
}

function parseData_(e) {
  var data = {};

  if (e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
      return data;
    } catch (err) {}
  }

  if (e.parameter && e.parameter.payload) {
    try {
      data = JSON.parse(e.parameter.payload);
      return data;
    } catch (err) {}
  }

  if (e.parameter) {
    data = {
      name: e.parameter.name || '',
      contact_type: e.parameter.contact_type || 'phone',
      phone: e.parameter.phone || '',
      email: e.parameter.email || '',
      service: e.parameter.service || '',
      message: e.parameter.message || '',
      consent: e.parameter.consent,
    };
  }

  return data;
}

function processRequest_(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var botToken = props.getProperty('BOT_TOKEN');
    var chatId = props.getProperty('CHAT_ID');
    var botUsername = props.getProperty('BOT_USERNAME') || 'zayavka_vizitka_bot';

    if (!botToken || !chatId) {
      return { ok: false, error: 'Сначала запустите setupSecrets() в редакторе скрипта' };
    }

    var data = parseData_(e);
    var error = validate_(data);
    if (error) {
      return { ok: false, error: error };
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
      return { ok: false, error: apiError };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

function validate_(data) {
  var name = String(data.name || '').trim();
  var contactType = data.contact_type || 'phone';
  var phone = String(data.phone || '').trim();
  var email = String(data.email || '').trim();
  var consent =
    data.consent === true ||
    data.consent === 'true' ||
    data.consent === '1' ||
    data.consent === 'yes';

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

function respond_(body, e) {
  var json = JSON.stringify(body);
  if (e && e.parameter && e.parameter.callback) {
    return ContentService.createTextOutput(e.parameter.callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
