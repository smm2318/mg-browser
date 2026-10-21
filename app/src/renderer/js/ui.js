'use strict';

(function () {
  const MG = window.MG;

  MG.esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  };

  MG.el = function (tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'html') el.innerHTML = value;
        else if (key === 'text') el.textContent = value;
        else if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'dataset') {
          for (const [dk, dv] of Object.entries(value)) el.dataset[dk] = dv;
        } else el.setAttribute(key, value === true ? '' : value);
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return el;
  };

  MG.icon = function (name, cls) {
    return `<svg class="icon ${cls || ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  };

  MG.formatBytes = function (bytes) {
    if (!bytes || bytes < 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
    return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
  };

  MG.timeAgo = function (timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const sec = Math.round(diff / 1000);
    const min = Math.round(sec / 60);
    const hour = Math.round(min / 60);
    const day = Math.round(hour / 24);
    const rtf = new Intl.RelativeTimeFormat(MG.i18n.getLang(), { numeric: 'auto' });
    if (Math.abs(sec) < 60) return rtf.format(-sec, 'second');
    if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
    if (Math.abs(hour) < 24) return rtf.format(-hour, 'hour');
    if (Math.abs(day) < 30) return rtf.format(-day, 'day');
    return new Date(timestamp).toLocaleDateString(MG.i18n.getLang() === 'fa' ? 'fa-IR' : 'en-US');
  };

  MG.prettyUrl = function (url) {
    if (!url) return '';
    if (/^file:.*newtab\.html/.test(url)) return '';
    try {
      const u = new URL(url);
      if (u.protocol === 'file:') return u.pathname.split(/[\\/]/).pop() || url;
      let text = u.hostname.replace(/^www\./, '') + u.pathname + u.search + u.hash;
      if (text.endsWith('/')) text = text.slice(0, -1);
      return u.protocol === 'http:' ? text : text;
    } catch {
      return url;
    }
  };

  MG.displayUrl = function (url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      if (u.protocol === 'file:') return 'MG Start';
      if (u.protocol === 'view-source:') return u.href;
      return u.href;
    } catch {
      return url;
    }
  };

  MG.hostOf = function (url) {
    try { return new URL(url).hostname; } catch { return ''; }
  };

  MG.monogram = function (name) {
    const clean = String(name || '').trim();
    if (!clean) return 'MG';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  MG.colorFor = function (text) {
    let hash = 0;
    const s = String(text || '');
    for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    const palette = ['#7c5cff', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];
    return palette[hash % palette.length];
  };

  MG.faviconHtml = function (tab, size = 16) {
    const letter = MG.esc((MG.hostOf(tab.url) || 'MG').replace(/^www\./, '').charAt(0).toUpperCase() || 'M');
    if (tab.isNewTab || !tab.url) {
      return `<span class="favicon favicon-fallback brand-fallback" style="--fav-color:${MG.colorFor('mg')}">${MG.icon('sparkles')}</span>`;
    }
    if (tab.favicon) {
      return `<span class="favicon"><img src="${MG.esc(tab.favicon)}" alt="" loading="lazy" data-fallback="1" data-letter="${letter}" style="--fav-color:${MG.colorFor(MG.hostOf(tab.url))}"></span>`;
    }
    return `<span class="favicon favicon-fallback" style="--fav-color:${MG.colorFor(MG.hostOf(tab.url))}">${letter}</span>`;
  };

  MG.faviconFallback = function (img) {
    const parent = img.closest('.favicon');
    if (!parent) return;
    const letter = img.dataset.letter || 'M';
    const color = img.style.getPropertyValue('--fav-color') || '#7c5cff';
    parent.classList.add('favicon-fallback');
    parent.style.setProperty('--fav-color', color);
    parent.textContent = letter;
    img.remove();
  };

  document.addEventListener('error', (event) => {
    const target = event.target;
    if (target && target.tagName === 'IMG' && target.closest('.favicon')) {
      MG.faviconFallback(target);
    }
    if (target && target.tagName === 'IMG' && (target.id === 'avatarImg' || target.classList.contains('avatar-img'))) {
      target.classList.add('hidden');
      const fallback = target.parentElement && target.parentElement.querySelector('.avatar-fallback');
      if (fallback) fallback.classList.remove('hidden');
    }
  }, true);

  MG.toast = function (message, kind = 'info', timeout = 2600) {
    const host = document.getElementById('toastHost');
    if (!host) return;
    const el = MG.el('div', { class: `toast toast-${kind}` }, MG.icon(
      kind === 'success' ? 'check' : kind === 'error' ? 'alert' : 'info'
    ), MG.el('span', { text: message }));
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 240);
    }, timeout);
  };

  MG.debounce = function (fn, wait) {
    let timer = null;
    const debounced = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
  };

  MG.clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  MG.copyText = async function (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  };

  MG.call = function (action, payload) {
    return window.mg.call(action, payload || {});
  };

  MG.hexToRgb = function (hex) {
    const value = String(hex || '').replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return '124, 92, 255';
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  };

  MG.selectionIndex = {
    index: 0,
    items: [],
    reset() { this.index = 0; this.items = []; },
    set(items) { this.items = items; this.index = 0; },
    move(delta) {
      if (!this.items.length) return;
      this.index = (this.index + delta + this.items.length) % this.items.length;
    }
  };
})();
