(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('.tabbar-item[data-nav="settings"]').click();
  await sleep(300);
  const dark = document.querySelector('#themeSeg button[data-theme="dark"]');
  dark.click();
  await sleep(300);
  return 'theme:' + document.documentElement.getAttribute('data-theme');
})()
