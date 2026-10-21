(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('.tabbar-item[data-nav="vault"]').click();
  await sleep(300);
  const pass = 'MG-demo-2026!';
  document.getElementById('masterPass').value = pass;
  document.getElementById('unlockBtn').click();
  await sleep(200);
  document.getElementById('masterPass2').value = pass;
  document.getElementById('unlockBtn').click();
  await sleep(900);

  const addEntry = async (site, user, pw) => {
    document.getElementById('addPwBtn').click();
    await sleep(150);
    document.getElementById('pwSite').value = site;
    document.getElementById('pwUser').value = user;
    document.getElementById('pwPass').value = pw;
    document.getElementById('savePw').click();
    await sleep(400);
  };
  await addEntry('https://accounts.google.com', 'sara@mgbrowser.app', 'Aurora!Sky#2024');
  await addEntry('https://github.com', 'sara-dev', 'Byte-Me-42-Cloud');
  await addEntry('https://dribbble.com', 'sara.design', 'Canvas&Ink!77');
  return 'vault:' + document.querySelectorAll('#vaultList .list-item').length;
})()
