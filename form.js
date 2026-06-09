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

  function getSendUrl() {
    const cfg = window.FORM_CONFIG || {};
    return cfg.sendUrl || 'send-telegram.php';
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

  function isLocalFile() {
    return window.location.protocol === 'file:';
  }

  async function sendToTelegram(data) {
    if (isLocalFile()) {
      throw new Error(
        'Сайт открыт с компьютера (file://). Загрузите сайт на хостинг — иначе заявка не отправится.'
      );
    }

    const cfg = window.FORM_CONFIG || {};
    const sendUrl = getSendUrl();

    if (cfg.isGitHubPages && !cfg.formApiUrl) {
      throw new Error(
        'Для отправки в Telegram нужен бесплатный API. Откройте НАСТРОЙКА-ФОРМЫ.md → Google Script (5 мин) → вставьте URL в form-config.js → formApiUrl.'
      );
    }

    let response;

    try {
      if (cfg.useGoogleScript) {
        // GET надёжнее POST для Google Script с GitHub Pages (нет CORS-ошибки)
        const payload = encodeURIComponent(JSON.stringify(data));
        const url = sendUrl + (sendUrl.includes('?') ? '&' : '?') + 'payload=' + payload;
        response = await fetch(url, { method: 'GET', redirect: 'follow' });
      } else {
        response = await fetch(sendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch (err) {
      throw new Error(
        'Не удалось связаться с сервером. Загрузите form.js и form-config.js на GitHub и проверьте URL Google Script (должен заканчиваться на /exec).'
      );
    }

    let result = {};
    try {
      const text = await response.text();
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(
        'Сервер вернул некорректный ответ. Проверьте, что Google Script развёрнут с доступом «Все».'
      );
    }

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Не удалось отправить заявку. Попробуйте позже.');
    }
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBlock.hidden = true;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.consent = form.querySelector('input[name="consent"]').checked;

    if (!data.consent) {
      showError('Необходимо дать согласие на обработку персональных данных.');
      return;
    }

    const isPhone = data.contact_type === 'phone';
    const phone = (data.phone || '').trim();
    const email = (data.email || '').trim();

    if (isPhone) {
      if (!phone) {
        showError('Укажите номер телефона.');
        return;
      }
      if (phone.replace(/\D/g, '').length < 10) {
        showError('Проверьте номер телефона — должно быть не менее 10 цифр.');
        return;
      }
    } else {
      if (!email) {
        showError('Укажите email.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Проверьте формат email, например: name@mail.ru');
        return;
      }
    }

    const payload = {
      name: (data.name || '').trim(),
      contact_type: data.contact_type,
      phone: isPhone ? phone : '',
      email: isPhone ? '' : email,
      service: (data.service || '').trim(),
      message: (data.message || '').trim(),
      consent: data.consent,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    try {
      await sendToTelegram(payload);
      showSuccess();
    } catch (err) {
      showError(err.message || 'Не удалось отправить заявку. Попробуйте позже.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });
})();
