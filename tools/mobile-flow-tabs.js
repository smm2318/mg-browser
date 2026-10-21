(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const add = async (url) => {
    const input = document.getElementById('tabUrl');
    input.value = url;
    document.getElementById('tabForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await sleep(200);
  };
  await add('https://en.wikipedia.org/wiki/Web_browser');
  await add('https://github.com/electron/electron');
  await add('https://www.youtube.com');
  await add('https://developer.mozilla.org/en-US/docs/Web');
  document.querySelector('.tabbar-item[data-nav="tabs"]').click();
  await sleep(400);
  return 'tabs:' + document.querySelectorAll('#tabsList .list-item').length;
})()
