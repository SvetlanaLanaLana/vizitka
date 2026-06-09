(function () {
  var host = window.location.hostname;
  var isGitHubPages = /\.github\.io$/i.test(host);
  var isVercel = /\.vercel\.app$/i.test(host);
  var isLocal = host === 'localhost' || host === '127.0.0.1';

  // ▼▼▼ ОБЯЗАТЕЛЬНО для GitHub Pages — URL API (см. НАСТРОЙКА-ФОРМЫ.md) ▼▼▼
  // Google Script: https://script.google.com/macros/s/.../exec
  // Vercel:       https://ваш-проект.vercel.app/api/send-telegram
  var formApiUrl = 'https://script.google.com/macros/s/AKfycbyNarZujFmYaQR3KCeY2Guqlew-1_roNlipVnn113fW6c2kFAz0ewOkEnIOuzrMUb/exec';

  var sendUrl = 'send-telegram.php';

  if (isVercel || isLocal) {
    sendUrl = '/api/send-telegram';
  } else if (isGitHubPages && formApiUrl) {
    sendUrl = formApiUrl;
  }

  window.FORM_CONFIG = {
    sendUrl: sendUrl,
    formApiUrl: formApiUrl,
    isGitHubPages: isGitHubPages,
    useGoogleScript: /script\.google\.com/i.test(formApiUrl),
    botUsername: 'zayavka_vizitka_bot',
  };
})();
