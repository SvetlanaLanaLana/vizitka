function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildMessage(data) {
  const name = (data.name || '').trim();
  const contactType = data.contact_type || 'phone';
  const phone = (data.phone || '').trim();
  const email = (data.email || '').trim();
  const service = (data.service || '').trim();
  const message = (data.message || '').trim();

  const contactLine =
    contactType === 'email' ? `📧 Email: ${email}` : `📱 Телефон: ${phone}`;

  const lines = ['🆕 Новая заявка с сайта', '', `👤 Имя: ${name}`, contactLine];

  if (service) lines.push(`🛠 Услуга: ${service}`);
  if (message) lines.push(`💬 Комментарий: ${message}`);

  lines.push('', '✅ Согласие на обработку персональных данных: да');

  return lines.join('\n');
}

function validate(data) {
  const name = (data.name || '').trim();
  const contactType = data.contact_type || 'phone';
  const phone = (data.phone || '').trim();
  const email = (data.email || '').trim();
  const consent = Boolean(data.consent);

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

module.exports = async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Метод не поддерживается' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'zayavka_vizitka_bot';

  if (!botToken || !chatId) {
    return res.status(500).json({
      ok: false,
      error: 'На сервере не заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID',
    });
  }

  const data = req.body || {};
  const validationError = validate(data);

  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  const text = buildMessage(data);
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: `Не удалось связаться с Telegram: ${err.message}`,
    });
  }

  let result = {};
  try {
    result = await response.json();
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Некорректный ответ Telegram' });
  }

  if (!result.ok) {
    let apiError = result.description || 'Неизвестная ошибка Telegram';

    if (/can't initiate conversation/i.test(apiError)) {
      apiError = `Сначала напишите боту @${botUsername} команду /start в Telegram, затем отправьте заявку снова.`;
    }

    return res.status(400).json({ ok: false, error: apiError });
  }

  return res.status(200).json({ ok: true });
};
