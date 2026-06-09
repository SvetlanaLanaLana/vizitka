(function () {
  var host = window.location.hostname;
  var isGitHubPages = /\.github\.io$/i.test(host);
  var isVercel = /\.vercel\.app$/i.test(host);
  var isLocal = host === 'localhost' || host === '127.0.0.1';

  // После деплоя на Vercel вставьте сюда URL вашего API (для GitHub Pages):
  // Пример: https://vizitka-api.vercel.app/api/send-telegram
  var vercelApiUrl = '';

  var sendUrl = 'send-telegram.php';

  if (isVercel || isLocal) {
    sendUrl = '/api/send-telegram';
  } else if (isGitHubPages && vercelApiUrl) {
    sendUrl = vercelApiUrl;
  }

  window.FORM_CONFIG = {
    sendUrl: sendUrl,
    vercelApiUrl: vercelApiUrl,
    isGitHubPages: isGitHubPages,
  };
})();
