'use strict';

(function () {
  const menuEl = document.getElementById('menu');
  let items = [];
  let selected = -1;

  function render(data) {
    document.documentElement.setAttribute('data-theme', data.theme === 'light' ? 'light' : 'dark');
    document.documentElement.lang = data.lang === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = data.lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.style.setProperty('--accent', data.accent || '#7c5cff');
    const hex = String(data.accent || '#7c5cff').replace('#', '');
    const num = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
    if (!Number.isNaN(num)) {
      document.documentElement.style.setProperty('--accent-rgb', `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`);
    }

    items = (data.items || []).filter(Boolean);
    menuEl.textContent = '';

    const brand = document.createElement('div');
    brand.className = 'menu-brand';
    brand.innerHTML = `<img src="assets/logo.svg" alt=""><span>MG</span><span class="dot">.</span>`;
    menuEl.appendChild(brand);

    for (const item of items) {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'menu-sep';
        menuEl.appendChild(sep);
        continue;
      }
      const button = document.createElement('button');
      button.className = 'menu-item';
      button.type = 'button';
      button.dataset.id = item.id;
      button.disabled = item.enabled === false;
      button.innerHTML = `<span class="bullet"></span><span>${escapeHtml(item.label || '')}</span>`;
      button.addEventListener('click', () => choose(item.id));
      menuEl.appendChild(button);
    }
    selected = -1;
  }

  function selectable() {
    return [...menuEl.querySelectorAll('.menu-item:not(:disabled)')];
  }

  function select(index) {
    const list = selectable();
    if (!list.length) return;
    selected = (index + list.length) % list.length;
    list.forEach((el, i) => el.classList.toggle('selected', i === selected));
    list[selected].scrollIntoView({ block: 'nearest' });
  }

  function choose(id) {
    if (!id) return;
    window.mgMenu.pick(id);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      window.mgMenu.close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      select(selected + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      select(selected - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const list = selectable();
      if (selected >= 0 && list[selected]) choose(list[selected].dataset.id);
      else if (list[0]) choose(list[0].dataset.id);
    }
  });

  window.addEventListener('blur', () => {
    window.mgMenu.close();
  });

  menuEl.addEventListener('contextmenu', (event) => event.preventDefault());

  window.mgMenu.onData(render);
})();
