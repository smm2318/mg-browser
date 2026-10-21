'use strict';

(function () {
  const MG = window.MG;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const t = (key, vars) => MG.t(key, vars);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const state = {
    theme: params.get('theme') || 'dark',
    lang: params.get('lang') === 'fa' ? 'fa' : 'en',
    accent: params.get('accent') || '#7c5cff',
    engines: [],
    engineId: params.get('engine') || 'google',
    data: null,
    suggestions: [],
    cards: [],
    selected: -1,
    enginePicker: false,
    hasApi: !!window.mgPage
  };

  function setTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.style.setProperty('--accent', state.accent);
    const hex = state.accent.replace('#', '');
    const num = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
    if (!Number.isNaN(num)) {
      document.documentElement.style.setProperty('--accent-rgb', `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`);
    }
  }

  function currentEngine() {
    return state.engines.find((e) => e.id === state.engineId) || state.engines[0] || {
      id: 'google', name: 'Google', glyph: 'G', color: '#4285f4'
    };
  }

  function applyLanguage() {
    MG.i18n.setLang(state.lang);
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? 'welcome.greeting.morning' : hour < 18 ? 'welcome.greeting.afternoon' : 'welcome.greeting.evening';
    $('greeting').textContent = t(greetingKey);
    $('subtitle').textContent = t('welcome.subtitle');
    $('q').placeholder = t('welcome.searchPlaceholder');
    $('quickTitle').textContent = t('welcome.topsites');
    $('recentTitle').textContent = t('welcome.continue');
    $('customizeBtn').textContent = t('welcome.customize');
    $('downloadsLabel').textContent = t('common.downloads');
    $('passwordsLabel').textContent = t('common.passwords');
    $('settingsLabel').textContent = t('common.settings');
    $('engineHint').textContent = t('common.searchWith') + ' ' + currentEngine().name;
    $('hintRow').innerHTML = `<kbd>Enter</kbd> ${t('welcome.enterToSearch')} · <kbd>/</kbd> ${t('welcome.slashToFocus')}`;
    $('dateLabel').textContent = new Date().toLocaleDateString(state.lang === 'fa' ? 'fa-IR' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }

  function renderEngine() {
    const engine = currentEngine();
    const glyph = $('engineGlyph');
    glyph.textContent = engine.glyph || engine.name.charAt(0);
    glyph.style.setProperty('--engine-color', engine.color || '#4285f4');
    $('engineHint').textContent = t('common.searchWith') + ' ' + engine.name;
  }

  function renderQuickLinks() {
    const grid = $('quickGrid');
    const data = state.data || {};
    const defaults = [
      { host: 'wikipedia.org', title: 'Wikipedia', url: 'https://www.wikipedia.org', color: '#3b4453', letter: 'W' },
      { host: 'github.com', title: 'GitHub', url: 'https://github.com', color: '#24292f', letter: 'G' },
      { host: 'youtube.com', title: 'YouTube', url: 'https://www.youtube.com', color: '#ff0033', letter: 'Y' },
      { host: 'gmail.com', title: 'Gmail', url: 'https://mail.google.com', color: '#ea4335', letter: 'M' },
      { host: 'reddit.com', title: 'Reddit', url: 'https://www.reddit.com', color: '#ff4500', letter: 'R' },
      { host: 'developer.mozilla.org', title: 'MDN', url: 'https://developer.mozilla.org', color: '#1b1b1b', letter: 'M' }
    ];
    const topsites = (data.topsites || []).filter((s) => s.host);
    const combined = [...topsites, ...defaults];
    const seen = new Set();
    const sites = [];
    for (const site of combined) {
      const key = String(site.host || '').split('.').slice(-2).join('.');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      sites.push(site);
      if (sites.length >= 8) break;
    }
    grid.innerHTML = sites.map((site) => {
      const host = (site.host || '').replace(/^www\./, '');
      const letter = (site.letter || host.charAt(0) || '?').toUpperCase();
      const color = site.color || colorFor(host);
      const favicon = site.favicon
        ? `<img src="${esc(site.favicon)}" alt="">`
        : '';
      return `<a class="quick" href="${esc(site.url)}" data-url="${esc(site.url)}" title="${esc(site.title || host)}">
        <span class="favicon" style="--fav-color:${esc(color)}" data-letter="${esc(letter)}">${favicon}${favicon ? '' : esc(letter)}</span>
        <span>${esc(site.title || host)}</span>
      </a>`;
    }).join('');
    grid.querySelectorAll('.favicon img').forEach((img) => {
      img.addEventListener('error', () => {
        const host = img.parentElement;
        const letter = host.dataset.letter || '?';
        img.remove();
        host.textContent = letter;
      });
    });
  }

  function colorFor(text) {
    let hash = 0;
    for (let i = 0; i < String(text).length; i += 1) hash = (hash * 31 + String(text).charCodeAt(i)) >>> 0;
    const palette = ['#7c5cff', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];
    return palette[hash % palette.length];
  }

  function renderRecent() {
    const row = $('recentRow');
    const data = state.data || {};
    let items = (data.history || []).slice(0, 5);
    const bookmarks = data.bookmarks || [];
    if (bookmarks.length) {
      items = [...bookmarks.slice(0, 3).map((b) => ({ ...b, visitedAt: 0 })), ...items].slice(0, 5);
    }
    if (!items.length) {
      $('recentSection').classList.add('hidden');
      return;
    }
    $('recentSection').classList.remove('hidden');
    row.innerHTML = items.map((item) => {
      const label = item.title || hostOf(item.url) || item.url;
      return `<div class="recent-chip" data-url="${esc(item.url)}" title="${esc(item.url)}">
        <span class="dot"></span><span>${esc(label)}</span>
      </div>`;
    }).join('');
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  /* ---------------------------------------------------------------- */
  /* suggestions                                                       */
  /* ---------------------------------------------------------------- */

  let seq = 0;
  let timer = null;

  function inputChanged() {
    clearTimeout(timer);
    const query = $('q').value.trim();
    if (!query) {
      closePanel();
      return;
    }
    timer = setTimeout(async () => {
      if (!state.hasApi) return;
      const current = ++seq;
      try {
        const data = await window.mgPage.suggest(query);
        if (current !== seq) return;
        state.suggestions = (data && data.suggestions) || [];
        state.cards = (data && data.cards) || [];
        if (data && data.history) state.historyHits = data.history;
        renderPanel();
      } catch { /* ignore */ }
    }, 120);
  }

  function renderPanel() {
    const panel = $('suggestPanel');
    const query = $('q').value.trim();
    let html = '';
    const answers = state.cards.filter((c) => c.kind !== 'search').slice(0, 2);
    for (const card of answers) {
      if (card.kind === 'calc') {
        html += `<div class="answer" data-url="" data-text="${esc(query)}">
          <div class="answer-thumb">✨</div>
          <div style="flex:1;min-width:0"><div class="answer-kicker">${esc(t('omni.calculator'))}</div>
          <div class="calc">${esc(card.text)}</div></div></div>`;
      } else {
        html += `<div class="answer" data-url="${esc(card.url || '')}" data-text="${esc(query)}">
          <div class="answer-thumb">${card.thumbnail ? `<img src="${esc(card.thumbnail)}" alt="">` : '💡'}</div>
          <div style="flex:1;min-width:0"><div class="answer-kicker">${esc(card.source || '')}</div>
          <div class="answer-title">${esc(card.title || '')}</div>
          <div class="answer-text">${esc(card.text || '')}</div>
          ${card.url ? `<a href="${esc(card.url)}" data-url="${esc(card.url)}">${esc(t('omni.readMore'))} ↗</a>` : ''}</div></div>`;
      }
    }
    const seen = new Set();
    for (const suggestion of state.suggestions) {
      if (seen.has(suggestion.text)) continue;
      seen.add(suggestion.text);
      html += `<div class="suggestion" data-text="${esc(suggestion.text)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <span>${esc(suggestion.text)}</span>
        <span class="src">${esc(suggestion.source || '')}</span>
      </div>`;
    }
    if (!html) {
      html = `<div class="suggestion" data-text="${esc(query)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <span>${esc(t('omni.searchFor', { q: query }))}</span><span class="src">${esc(currentEngine().name)}</span></div>`;
    }
    panel.innerHTML = html;
    panel.classList.add('open');
    state.selected = -1;
  }

  function closePanel() {
    $('suggestPanel').classList.remove('open');
    state.selected = -1;
    state.enginePicker = false;
  }

  function renderEnginePicker() {
    const panel = $('suggestPanel');
    const engine = currentEngine();
    let html = '';
    for (const item of state.engines) {
      html += `<div class="engine-option ${item.id === engine.id ? 'active' : ''}" data-engine="${esc(item.id)}">
        <span class="engine-glyph" style="--engine-color:${esc(item.color || '#7c5cff')}">${esc(item.glyph || item.name.charAt(0))}</span>
        <span>${esc(item.name)}</span>
      </div>`;
    }
    panel.innerHTML = `<div class="engine-grid">${html}</div>`;
    panel.classList.add('open');
    state.enginePicker = true;
  }

  function selectSuggestion(delta) {
    const items = [...$('suggestPanel').querySelectorAll('.suggestion')];
    if (!items.length) return;
    state.selected = (state.selected + delta + items.length) % items.length;
    items.forEach((item, index) => item.classList.toggle('selected', index === state.selected));
    items[state.selected].scrollIntoView({ block: 'nearest' });
  }

  async function navigate(url) {
    if (!url) return;
    if (state.hasApi) await window.mgPage.navigate(url);
    else window.location.href = url;
  }

  async function performSearch(text, engineId, newTab) {
    const value = String(text || '').trim();
    if (!value) return;
    if (!state.hasApi) {
      window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(value);
      return;
    }
    const result = await window.mgPage.search(value, engineId || state.engineId);
    if (result && result.url) {
      if (newTab) await window.mgPage.newTab(result.url);
      else await window.mgPage.navigate(result.url);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const value = $('q').value.trim();
    if (!value) return;
    if (value.includes('.') && !value.includes(' ') && state.hasApi) {
      const result = await window.mgPage.search(value, state.engineId);
      if (result && result.url) navigate(result.url);
      return;
    }
    performSearch(value, state.engineId, false);
  }

  /* ---------------------------------------------------------------- */
  /* events                                                            */
  /* ---------------------------------------------------------------- */

  function bind() {
    const input = $('q');
    input.addEventListener('focus', () => {
      document.querySelector('.search').classList.add('focused');
      if (input.value.trim()) inputChanged();
    });
    input.addEventListener('blur', () => {
      document.querySelector('.search').classList.remove('focused');
      setTimeout(() => {
        if (!$('suggestPanel').matches(':hover')) closePanel();
      }, 140);
    });
    input.addEventListener('input', inputChanged);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); selectSuggestion(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); selectSuggestion(-1); }
      else if (event.key === 'Escape') { closePanel(); }
      else if (event.key === 'Enter' && state.selected >= 0) {
        const items = [...$('suggestPanel').querySelectorAll('.suggestion')];
        const item = items[state.selected];
        if (item) {
          event.preventDefault();
          performSearch(item.dataset.text, state.engineId, event.ctrlKey || event.metaKey);
        }
      }
    });

    $('searchForm').addEventListener('submit', onSubmit);

    $('engineBtn').addEventListener('click', (event) => {
      event.stopPropagation();
      if (state.enginePicker) closePanel();
      else renderEnginePicker();
    });

    $('suggestPanel').addEventListener('mousedown', (event) => event.preventDefault());
    $('suggestPanel').addEventListener('click', (event) => {
      const engineOption = event.target.closest('[data-engine]');
      if (engineOption) {
        state.engineId = engineOption.dataset.engine;
        renderEngine();
        closePanel();
        input.focus();
        if (input.value.trim()) inputChanged();
        return;
      }
      const answer = event.target.closest('.answer');
      if (answer) {
        const url = answer.dataset.url;
        if (url) navigate(url);
        else performSearch(answer.dataset.text || input.value, state.engineId, false);
        return;
      }
      const suggestion = event.target.closest('.suggestion');
      if (suggestion) {
        performSearch(suggestion.dataset.text, state.engineId, false);
      }
    });

    $('quickGrid').addEventListener('click', (event) => {
      const link = event.target.closest('[data-url]');
      if (!link) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) window.mgPage && window.mgPage.newTab(link.dataset.url);
      else navigate(link.dataset.url);
    });

    $('recentRow').addEventListener('click', (event) => {
      const chip = event.target.closest('[data-url]');
      if (chip) navigate(chip.dataset.url);
    });

    $('customizeBtn').addEventListener('click', () => window.mgPage && window.mgPage.openSettings());
    $('settingsBtn').addEventListener('click', () => window.mgPage && window.mgPage.openSettings());
    $('downloadsBtn').addEventListener('click', () => window.mgPage && window.mgPage.openDownloads());
    $('passwordsBtn').addEventListener('click', () => window.mgPage && window.mgPage.openPasswords());

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-shell')) closePanel();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && document.activeElement !== input) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  async function boot() {
    setTheme();
    applyLanguage();
    if (state.hasApi) {
      try {
        const data = await window.mgPage.data();
        state.data = data;
        state.engines = (data && data.engines) || [];
        if (data && data.settings) {
          state.theme = data.theme || state.theme;
          state.lang = data.settings.language || state.lang;
          state.accent = data.settings.accent || state.accent;
          state.engineId = data.settings.searchEngine || state.engineId;
          setTheme();
          applyLanguage();
        }
        $('version').textContent = 'MG ' + (data.version || '1.0');
      } catch { /* ignore */ }
    }
    renderEngine();
    renderQuickLinks();
    renderRecent();
    bind();
    $('q').focus();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
