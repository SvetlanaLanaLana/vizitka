(function () {
  const modal = document.getElementById('request-modal');
  if (!modal) return;

  const form = document.getElementById('request-form');
  const overlay = modal.querySelector('.modal__overlay');
  const closeButtons = modal.querySelectorAll('[data-close-modal]');
  const serviceField = document.getElementById('request-service');
  const contactTypeRadios = form.querySelectorAll('input[name="contact_type"]');
  const phoneGroup = document.getElementById('phone-group');
  const emailGroup = document.getElementById('email-group');
  const phoneInput = document.getElementById('request-phone');
  const emailInput = document.getElementById('request-email');
  const submitBtn = document.getElementById('request-submit');
  const successBlock = document.getElementById('form-success');
  const errorBlock = document.getElementById('form-error');
  const formBody = document.getElementById('form-body');

  let iframe = document.getElementById('tg-frame');

  function createIframe() {
    iframe = document.createElement('iframe');
    iframe.id = 'tg-frame';
    iframe.name = 'tg-frame';
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    return iframe;
  }

  function openModal(service) {
    form.reset();
    resetFormState();
    if (serviceField) serviceField.value = service || '';
    const phoneRadio = form.querySelector('input[name="contact_type"][value="phone"]');
    if (phoneRadio) phoneRadio.checked = true;
    toggleContactFields();
    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('request-name').focus();
  }

  function closeModal() {
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function resetFormState() {
    successBlock.hidden = true;
    errorBlock.hidden = true;
    formBody.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить заявку';
  }

  function toggleContactFields() {
    const type = form.querySelector('input[name="contact_type"]:checked')?.value || 'phone';
    const isPhone = type === 'phone';

    phoneGroup.hidden = !isPhone;
    emailGroup.hidden = isPhone;
    phoneInput.required = isPhone;
    emailInput.required = !isPhone;

    if (isPhone) {
      emailInput.value = '';
    } else {
      phoneInput.value = '';
    }
  }

  function showError(message) {
    errorBlock.textContent = message;
    errorBlock.hidden = false;
    successBlock.hidden = true;
  }

  function showSuccess() {
    formBody.hidden = true;
    errorBlock.hidden = true;
    successBlock.hidden = false;
  }

  function buildMessage(data) {
    const contactLine = data.contact_type === 'phone'
      ? `📱 Телефон: ${data.phone}`
      : `📧 Email: ${data.email}`;

    const lines = [
      '🆕 <b>Новая заявка с сайта</b>',
      '',
      `👤 <b>Имя:</b> ${escapeHtml(data.name)}`,
      contactLine,
    ];

    if (data.service) {
      lines.push(`🛠 <b>Услуга:</b> ${escapeHtml(data.service)}`);
    }

    if (data.message) {
      lines.push(`💬 <b>Комментарий:</b> ${escapeHtml(data.message)}`);
    }

    lines.push('', '✅ Согласие на обработку персональных данных: да');

    return lines.join('\n');
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function sendToTelegram(text) {
    const config = window.TG_CONFIG || {};

    if (!config.botToken) {
      throw new Error('Не настроен токен Telegram-бота. Проверьте файл config.js');
    }

    if (!config.chatId) {
      throw new Error('Не настроен chat_id. Укажите его в файле config.js (узнать можно у @userinfobot)');
    }

    if (!iframe) createIframe();

    const formEl = document.createElement('form');
    formEl.method = 'POST';
    formEl.action = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    formEl.target = 'tg-frame';
    formEl.style.display = 'none';

    const fields = {
      chat_id: config.chatId,
      text: text,
      parse_mode: 'HTML',
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      formEl.appendChild(input);
    });

    document.body.appendChild(formEl);
    formEl.submit();
    document.body.removeChild(formEl);
  }

  document.querySelectorAll('.js-open-form').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.service || '');
    });
  });

  contactTypeRadios.forEach((radio) => {
    radio.addEventListener('change', toggleContactFields);
  });

  closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));
  overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) {
      closeModal();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorBlock.hidden = true;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.consent) {
      showError('Необходимо дать согласие на обработку персональных данных.');
      return;
    }

    if (data.contact_type === 'phone' && !data.phone?.trim()) {
      showError('Укажите номер телефона.');
      return;
    }

    if (data.contact_type === 'email' && !data.email?.trim()) {
      showError('Укажите email.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    try {
      const message = buildMessage(data);
      sendToTelegram(message);

      setTimeout(() => {
        showSuccess();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить заявку';
      }, 600);
    } catch (err) {
      showError(err.message || 'Не удалось отправить заявку. Попробуйте позже.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });
})();
