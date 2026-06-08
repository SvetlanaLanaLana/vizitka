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

  const SEND_URL = 'send-telegram.php';

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
        'Сайт открыт с компьютера (file://). Загрузите папку на хостинг с PHP или откройте через локальный сервер — иначе заявка не отправится.'
      );
    }

    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    let result = {};
    try {
      result = await response.json();
    } catch (e) {
      throw new Error('Сервер не ответил. Убедитесь, что на хостинге включён PHP и файл send-telegram.php загружен.');
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
      await sendToTelegram(data);
      showSuccess();
    } catch (err) {
      showError(err.message || 'Не удалось отправить заявку. Попробуйте позже.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });
})();
