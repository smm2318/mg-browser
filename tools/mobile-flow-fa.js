(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('.tabbar-item[data-nav="settings"]').click();
  await sleep(250);
  document.querySelector('#langSeg button[data-lang="fa"]').click();
  await sleep(450);
  document.querySelector('.tabbar-item[data-nav="home"]').click();
  await sleep(400);
  return 'fa home';
})()
