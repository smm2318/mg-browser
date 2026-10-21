(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('.tabbar-item[data-nav="settings"]').click();
  await sleep(250);
  document.querySelector('#themeSeg button[data-theme="dark"]').click();
  await sleep(350);
  document.querySelector('.tabbar-item[data-nav="home"]').click();
  await sleep(400);
  return 'dark home';
})()
