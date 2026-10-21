'use strict';

(function () {
  const params = new URLSearchParams(location.search);
  const failedUrl = params.get('url') || '';
  const code = params.get('code') || '';
  const description = params.get('desc') || 'The page could not be loaded.';
  const theme = params.get('theme') || '';
  const lang = params.get('lang') || 'en';

  if (theme === 'light') document.body.classList.add('light');
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';

  const fa = lang === 'fa';
  const offline = code === '-106';
  const notFound = code === '-105' || code === '-137';

  document.getElementById('title').textContent = fa
    ? (offline ? 'اتصال اینترنت برقرار نیست' : notFound ? 'نشانی پیدا نشد' : 'این صفحه بارگذاری نشد')
    : (offline ? 'You appear to be offline' : notFound ? 'Address not found' : 'This page could not load');
  document.getElementById('message').textContent = fa
    ? (offline ? 'اتصال شبکه را بررسی کنید و دوباره تلاش کنید.'
      : notFound ? 'نشانی را بررسی کنید؛ دامنه پیدا نشد یا در دسترس نیست.'
      : 'ممکن است صفحه جابه‌جا شده یا موقتاً در دسترس نباشد.')
    : (offline ? 'Check your network connection and try again.'
      : notFound ? 'Check the address — the domain could not be found or reached.'
      : 'The page may have moved, or the server is not responding.');
  document.getElementById('url').textContent = failedUrl;
  document.getElementById('retry').textContent = fa ? 'تلاش دوباره' : 'Try again';
  document.getElementById('back').textContent = fa ? 'بازگشت' : 'Go back';
  const details = document.getElementById('details');
  const summary = details.querySelector('summary');
  summary.textContent = fa ? 'جزئیات' : 'Details';
  document.getElementById('detailsText').textContent =
    `Error code: ${code}\n${description}\nURL: ${failedUrl}`;
  document.querySelector('.brand').textContent = fa ? 'مرورگر MG' : 'MG Browser';

  document.getElementById('retry').addEventListener('click', () => {
    if (failedUrl) location.href = failedUrl;
  });
  document.getElementById('back').addEventListener('click', () => {
    history.back();
  });
  if (!failedUrl) document.getElementById('retry').classList.add('hidden');
})();
