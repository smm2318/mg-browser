'use strict';

(function () {
  const MG = window.MG;

  const state = {
    settings: {},
    profile: {},
    tabs: [],
    activeId: null,
    split: null,
    engines: [],
    downloads: [],
    bookmarks: [],
    history: [],
    maximized: false,
    platform: 'win32',
    isMac: false,
    versions: {},
    userData: '',
    sidebar: null,
    devtoolsOpen: false,
    settingsOpen: false,
    settingsSection: 'general',
    fullscreen: false,
    progress: null,
    editingOmnibox: false,
    tabSignature: ''
  };

  MG.state = state;

  const $ = (id) => document.getElementById(id);

  function t(key, vars) {
    return MG.t(key, vars);
  }

  function activeTab() {
    return state.tabs.find((tab) => tab.id === state.activeId) || null;
  }

  function tabById(id) {
    return state.tabs.find((tab) => tab.id === Number(id)) || null;
  }

  function currentEngine() {
    return state.engines.find((e) => e.id === state.settings.searchEngine) || state.engines[0] || {
      id: 'google', name: 'Google', color: '#4285f4', glyph: 'G'
    };
  }

  /* ---------------------------------------------------------------- */
  /* theme + language                                                  */
  /* ---------------------------------------------------------------- */

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme() {
    const pref = state.settings.theme || 'system';
    const effective = pref === 'system' ? systemTheme() : pref;
    document.documentElement.setAttribute('data-theme', effective);
    const accent = state.settings.accent || '#7c5cff';
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-rgb', MG.hexToRgb(accent));
    if (MG.settingsUI && state.settingsOpen) MG.settingsUI.render();
  }

  function applyLanguage() {
    MG.i18n.setLang(state.settings.language || 'en');
    MG.i18n.applyTranslations(document);
    document.title = t('app.name');
    updateOmniboxPlaceholder();
    renderTabs();
    renderToolbar();
    renderSplitBar();
    if (MG.omni) MG.omni.refresh();
    if (state.settingsOpen && MG.settingsUI) MG.settingsUI.render();
    if (state.sidebar && MG.panels) MG.panels.renderSidebar();
    if (state.devtoolsOpen && MG.devtoolsUI) MG.devtoolsUI.render();
  }

  function updateOmniboxPlaceholder() {
    const engine = currentEngine();
    const input = $('omnibox');
    if (input) input.setAttribute('placeholder', t('omni.placeholder', { engine: engine ? engine.name : 'the web' }));
  }

  function setPlatformClasses() {
    const app = $('app');
    app.classList.remove('platform-win32', 'platform-darwin', 'platform-linux', 'platform-unknown');
    app.classList.add('platform-' + (state.platform || 'unknown'));
    if (state.isMac) app.classList.add('platform-mac');
  }

  /* ---------------------------------------------------------------- */
  /* layout                                                            */
  /* ---------------------------------------------------------------- */

  let layoutFrame = null;

  function updateLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null;
      const header = $('header');
      const headerH = Math.round(header.getBoundingClientRect().height);
      const sidebarW = state.sidebar ? 380 : 0;
      const devtoolsH = state.devtoolsOpen ? 320 : 0;
      const root = document.documentElement;
      root.style.setProperty('--header-h', headerH + 'px');
      root.style.setProperty('--sidebar-w', sidebarW + 'px');

      const sidebar = $('sidebar');
      if (sidebar) {
        sidebar.style.top = headerH + 'px';
        sidebar.style.width = sidebarW + 'px';
      }
      const devtools = $('devtoolsPanel');
      if (devtools) {
        devtools.style.height = devtoolsH + 'px';
        devtools.style.right = sidebarW + 'px';
      }
      const splitbar = $('splitbar');
      if (splitbar) {
        splitbar.style.paddingLeft = '8px';
        splitbar.style.paddingRight = (sidebarW + 8) + 'px';
      }
      MG.call('layout:insets', {
        top: headerH,
        right: sidebarW,
        bottom: devtoolsH,
        left: 0
      });
      updateSplitDivider();
    });
  }

  function contentGeometry() {
    const headerH = Math.round($('header').getBoundingClientRect().height);
    const sidebarW = state.sidebar ? 380 : 0;
    const devtoolsH = state.devtoolsOpen ? 320 : 0;
    return {
      x: 8,
      y: headerH + 8,
      width: Math.max(0, window.innerWidth - sidebarW - 16),
      height: Math.max(0, window.innerHeight - headerH - devtoolsH - 16),
      sidebarW,
      devtoolsH
    };
  }

  function splitWidths() {
    const geo = contentGeometry();
    const gap = 10;
    const ratio = state.split ? MG.clamp(state.split.ratio || 0.5, 0.2, 0.8) : 0.5;
    const leftWidth = Math.max(140, Math.round((geo.width - gap) * ratio));
    return { geo, gap, leftWidth, rightWidth: Math.max(140, geo.width - gap - leftWidth) };
  }

  function updateSplitDivider() {
    const divider = $('splitDivider');
    if (!divider) return;
    if (!state.split) {
      divider.classList.add('hidden');
      return;
    }
    const { geo, leftWidth } = splitWidths();
    divider.classList.remove('hidden');
    divider.style.left = (geo.x + leftWidth) + 'px';
    divider.style.top = (geo.y - 8) + 'px';
    divider.style.height = (geo.height + 16) + 'px';
  }

  /* ---------------------------------------------------------------- */
  /* tabs                                                              */
  /* ---------------------------------------------------------------- */

  function tabTitle(tab) {
    if (tab.error) return tab.error.code === -106 ? t('error.offlineTitle') : t('error.tabTitle');
    if (tab.isNewTab || /newtab\.html/i.test(tab.url || '')) return t('common.newTab');
    return tab.title || MG.prettyUrl(tab.url) || t('common.newTab');
  }

  function renderTabs() {
    const host = $('tabs');
    if (!host) return;
    const list = [...state.tabs].sort((a, b) => (a.index || 0) - (b.index || 0));
    const signature = list.map((tab) => tab.id).join(',');
    if (signature !== state.tabSignature) {
      state.tabSignature = signature;
      host.textContent = '';
      for (const tab of list) host.appendChild(buildTabNode(tab));
    }
    for (const tab of list) updateTabNode(tab);
    $('newTabBtn').classList.toggle('hidden', false);
  }

  function buildTabNode(tab) {
    const node = document.createElement('div');
    node.className = 'tab';
    node.dataset.id = String(tab.id);
    node.draggable = true;
    node.innerHTML =
      `<span class="tab-favicon"></span>` +
      `<span class="tab-title"></span>` +
      `<button class="tab-close" aria-label="Close tab"><svg class="icon"><use href="#i-close"></use></svg></button>`;
    node.addEventListener('click', (event) => {
      if (event.target.closest('.tab-close')) {
        event.stopPropagation();
        MG.call('tabs:close', { id: tab.id });
        return;
      }
      if (tab.splitSide) MG.call('split:focus', { id: tab.id });
      else MG.call('tabs:activate', { id: tab.id });
    });
    node.addEventListener('auxclick', (event) => {
      if (event.button === 1) {
        event.preventDefault();
        MG.call('tabs:close', { id: tab.id });
      }
    });
    node.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      MG.call('tabs:menu', { id: tab.id });
    });
    node.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', String(tab.id));
      event.dataTransfer.effectAllowed = 'move';
      node.classList.add('dragging');
    });
    node.addEventListener('dragend', () => node.classList.remove('dragging'));
    node.addEventListener('dragover', (event) => {
      event.preventDefault();
      node.classList.add('drag-over');
    });
    node.addEventListener('dragleave', () => node.classList.remove('drag-over'));
    node.addEventListener('drop', (event) => {
      event.preventDefault();
      node.classList.remove('drag-over');
      const draggedId = Number(event.dataTransfer.getData('text/plain'));
      if (!draggedId || draggedId === tab.id) return;
      const rect = node.getBoundingClientRect();
      const after = (event.clientX - rect.left) > rect.width / 2;
      const targetIndex = listIndexOf(tab.id) + (after ? 1 : 0);
      MG.call('tabs:move', { id: draggedId, index: targetIndex });
    });
    return node;
  }

  function listIndexOf(id) {
    const list = [...state.tabs].sort((a, b) => (a.index || 0) - (b.index || 0));
    return list.findIndex((tab) => tab.id === id);
  }

  function updateTabNode(tab) {
    const node = document.querySelector(`.tab[data-id="${tab.id}"]`);
    if (!node) {
      renderTabs();
      return;
    }
    node.classList.toggle('active', tab.id === state.activeId);
    node.classList.toggle('pinned', !!tab.pinned);
    node.classList.toggle('tab-loading', !!tab.loading);
    if (state.settings.showTabTooltips !== false) {
      node.title = tabTitle(tab) + (tab.url && !tab.isNewTab ? '\n' + MG.prettyUrl(tab.url) : '');
    } else {
      node.removeAttribute('title');
    }
    const titleEl = node.querySelector('.tab-title');
    const title = tabTitle(tab);
    if (titleEl.textContent !== title) titleEl.textContent = title;
    const favHost = node.querySelector('.tab-favicon');
    const favKey = (tab.favicon || '') + '|' + (tab.isNewTab ? 'new' : '') + '|' + (tab.url || '');
    if (favHost.dataset.key !== favKey) {
      favHost.dataset.key = favKey;
      favHost.innerHTML = MG.faviconHtml(tab);
      if (tab.loading) {
        const spinner = document.createElement('span');
        spinner.className = 'tab-spinner';
        favHost.appendChild(spinner);
      }
    }
    if (tab.audible) {
      if (!node.querySelector('.tab-audio')) {
        const dot = document.createElement('span');
        dot.className = 'tab-audio';
        node.appendChild(dot);
      }
    } else {
      const dot = node.querySelector('.tab-audio');
      if (dot) dot.remove();
    }
    const splitBadge = node.querySelector('.tab-split-mark');
    if (tab.splitSide) {
      if (!splitBadge) {
        const mark = document.createElement('span');
        mark.className = 'tab-split-mark';
        mark.textContent = tab.splitSide === 'left' ? '◧' : '◨';
        mark.style.cssText = 'font-size:9px;color:var(--accent);opacity:.9';
        node.appendChild(mark);
      }
    } else if (splitBadge) {
      splitBadge.remove();
    }
  }

  function renderToolbar() {
    const tab = activeTab();
    const back = document.querySelector('[data-nav="back"]');
    const forward = document.querySelector('[data-nav="forward"]');
    const reload = $('reloadBtn');
    if (!tab) return;
    back.disabled = !tab.canGoBack;
    forward.disabled = !tab.canGoForward;
    reload.innerHTML = `<svg class="icon"><use href="#i-${tab.loading && !tab.isNewTab ? 'stop' : 'reload'}"></use></svg>`;
    reload.title = tab.loading && !tab.isNewTab ? t('toolbar.stop') : t('toolbar.reload');

    const omnibox = $('omnibox');
    if (!state.editingOmnibox) {
      omnibox.value = tab.isNewTab ? '' : MG.displayUrl(tab.url);
    }
    updateSiteBadge(tab);
    updateBookmarkButton(tab);
    updateEngineButton();
    updateAvatar();
    updateSplitUI();
    updateDownloadsBadge();
    document.title = (tab && !tab.isNewTab ? tab.title + ' — ' : '') + t('app.name');
    const splitBtn = $('splitBtn');
    splitBtn.classList.toggle('active', !!state.split);
    if (MG.omni) MG.omni.syncFromTab(tab);
  }

  function updateSiteBadge(tab) {
    const badge = $('siteBadge');
    if (!badge) return;
    badge.classList.remove('secure', 'insecure', 'internal');
    let icon = 'globe';
    if (tab.isNewTab || !tab.url) {
      icon = 'sparkles';
      badge.classList.add('internal');
    } else if (/^https:/i.test(tab.url)) {
      icon = 'lock';
      badge.classList.add('secure');
    } else if (/^http:/i.test(tab.url)) {
      icon = 'unlock';
      badge.classList.add('insecure');
    } else if (/^file:/i.test(tab.url)) {
      icon = 'folder';
      badge.classList.add('internal');
    } else if (/^view-source:/i.test(tab.url)) {
      icon = 'code';
    }
    badge.innerHTML = `<svg class="icon"><use href="#i-${icon}"></use></svg>`;
  }

  function updateBookmarkButton(tab) {
    const btn = $('bookmarkBtn');
    if (!btn) return;
    const bookmarked = !!(tab && tab.url && state.bookmarks.some((b) => b.url === tab.url));
    btn.classList.toggle('active', bookmarked);
    btn.setAttribute('title', bookmarked ? t('toolbar.bookmarked') : t('toolbar.bookmark'));
    btn.disabled = !tab || !/^https?:/i.test(tab.url || '');
  }

  function updateEngineButton() {
    const engine = currentEngine();
    const glyph = $('engineGlyph');
    if (!glyph) return;
    glyph.textContent = engine.glyph || engine.name.charAt(0);
    glyph.style.setProperty('--engine-color', engine.color || '#4285f4');
    const btn = $('engineBtn');
    btn.setAttribute('title', t('omni.switchEngine'));
    updateOmniboxPlaceholder();
  }

  function updateAvatar() {
    const img = $('avatarImg');
    const fallback = $('avatarFallback');
    const btn = $('avatarBtn');
    const profile = state.profile || {};
    if (profile.avatar) {
      img.src = profile.avatar;
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
    } else {
      img.removeAttribute('src');
      img.classList.add('hidden');
      fallback.classList.remove('hidden');
      fallback.textContent = MG.monogram(profile.name || '');
    }
    const signedIn = !!(profile.avatar || profile.email);
    btn.classList.toggle('signed-in', signedIn);
    btn.title = signedIn ? `${profile.name || profile.email}\n${profile.email || ''}` : t('toolbar.profile');
  }

  function updateDownloadsBadge() {
    const badge = $('downloadsBadge');
    if (!badge) return;
    const active = state.downloads.filter((d) => d.state === 'progressing' || d.state === 'paused').length;
    badge.textContent = String(active);
    badge.classList.toggle('hidden', active === 0);
  }

  function renderSplitBar() {
    const bar = $('splitbar');
    if (!bar) return;
    if (!state.split) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    const left = state.tabs.find((tab) => tab.id === state.split.left);
    const right = state.tabs.find((tab) => tab.id === state.split.right);
    const renderSide = (tab, side) => {
      if (!tab) return '';
      return `<span class="tab-favicon">${MG.faviconHtml(tab)}</span>` +
        `<span class="tab-title">${MG.esc(tabTitle(tab))}</span>` +
        `<span class="omni-row-hint">${side === 'left' ? t('split.left') : t('split.right')}</span>`;
    };
    $('splitLeftInfo').innerHTML = renderSide(left, 'left');
    $('splitRightInfo').innerHTML = renderSide(right, 'right');
    $('splitLeftInfo').classList.toggle('active', state.activeId === state.split.left);
    $('splitRightInfo').classList.toggle('active', state.activeId === state.split.right);
    $('splitSwapBtn').title = t('split.swap');
    $('splitCloseBtn').title = t('split.close');
    const { leftWidth } = splitWidths();
    $('splitLeftInfo').style.flex = 'none';
    $('splitLeftInfo').style.width = leftWidth + 'px';
    $('splitRightInfo').style.flex = '1';
    updateSplitDivider();
  }

  function updateSplitUI() {
    renderSplitBar();
  }

  /* ---------------------------------------------------------------- */
  /* special bars                                                      */
  /* ---------------------------------------------------------------- */

  function showProgress(value) {
    const wrap = $('progress');
    const bar = $('progressBar');
    if (value == null) {
      wrap.classList.add('hidden');
      bar.style.width = '0%';
      return;
    }
    wrap.classList.remove('hidden');
    bar.style.width = `${Math.round(value * 100)}%`;
    if (value >= 1) {
      setTimeout(() => wrap.classList.add('hidden'), 320);
    }
  }

  function toggleFindBar(show) {
    const bar = $('findbar');
    const visible = show === undefined ? bar.classList.contains('hidden') : show;
    bar.classList.toggle('hidden', !visible);
    if (visible) {
      const input = $('findInput');
      input.focus();
      input.select();
      if (input.value) MG.call('tabs:find', { text: input.value });
    } else {
      MG.call('tabs:findStop');
      const tab = activeTab();
      if (tab) MG.call('tabs:activate', { id: tab.id });
    }
    updateLayout();
  }

  function showSaveBar(html) {
    const bar = $('savebar');
    bar.innerHTML = html;
    bar.classList.remove('hidden');
    updateLayout();
  }

  function hideSaveBar() {
    const bar = $('savebar');
    bar.classList.add('hidden');
    bar.innerHTML = '';
    updateLayout();
  }

  function showPermission(payload) {
    const bar = $('savebar');
    const host = payload.origin || 'this site';
    bar.innerHTML =
      `<span class="savebar-icon"><svg class="icon"><use href="#i-shield"></use></svg></span>` +
      `<div class="savebar-text"><div class="savebar-title">${MG.esc(host)} wants permission</div>` +
      `<div class="savebar-sub">${MG.esc(payload.permission)}</div></div>` +
      `<div class="savebar-actions">` +
      `<button class="btn ghost" data-perm="deny">${MG.esc(t('common.cancel'))}</button>` +
      `<button class="btn primary" data-perm="allow">Allow</button>` +
      `</div>`;
    bar.classList.remove('hidden');
    bar.querySelector('[data-perm="allow"]').addEventListener('click', () => {
      MG.call('permission:respond', { requestId: payload.requestId, allow: true });
      hideSaveBar();
    });
    bar.querySelector('[data-perm="deny"]').addEventListener('click', () => {
      MG.call('permission:respond', { requestId: payload.requestId, allow: false });
      hideSaveBar();
    });
    updateLayout();
  }

  /* ---------------------------------------------------------------- */
  /* settings / panels                                                 */
  /* ---------------------------------------------------------------- */

  function openSettings(section) {
    state.settingsOpen = true;
    state.settingsSection = section || 'general';
    $('settingsOverlay').classList.remove('hidden');
    MG.call('layout:viewsVisible', { visible: false });
    if (MG.settingsUI) MG.settingsUI.open(state.settingsSection);
  }

  function closeSettings() {
    state.settingsOpen = false;
    $('settingsOverlay').classList.add('hidden');
    MG.call('layout:viewsVisible', { visible: true });
    const tab = activeTab();
    if (tab) MG.call('tabs:activate', { id: tab.id });
    MG.settingsUI && MG.settingsUI.close();
  }

  function toggleSidebar(view) {
    state.sidebar = state.sidebar === view ? null : view;
    if (state.sidebar && MG.panels) MG.panels.renderSidebar();
    updateSidebarVisibility();
    updateLayout();
  }

  function openSidebar(view) {
    if (!view) {
      state.sidebar = null;
      updateSidebarVisibility();
      updateLayout();
      return;
    }
    state.sidebar = view;
    if (MG.panels) MG.panels.renderSidebar();
    updateSidebarVisibility();
    updateLayout();
  }

  function updateSidebarVisibility() {
    const sidebar = $('sidebar');
    sidebar.classList.toggle('hidden', !state.sidebar);
    $('downloadsBtn').classList.toggle('active', state.sidebar === 'downloads');
    $('passwordsBtn').classList.toggle('active', state.sidebar === 'passwords');
  }

  function toggleDevtoolsPanel() {
    state.devtoolsOpen = !state.devtoolsOpen;
    const panel = $('devtoolsPanel');
    panel.classList.toggle('hidden', !state.devtoolsOpen);
    $('devtoolsBtn').classList.toggle('active', state.devtoolsOpen);
    if (state.devtoolsOpen) {
      if (MG.devtoolsUI) MG.devtoolsUI.open();
      MG.call('devtools:toggle', { open: true });
    } else {
      MG.call('devtools:toggle', { open: false });
    }
    updateLayout();
  }

  function setDevtoolsOpen(open) {
    if (state.devtoolsOpen === !!open) return;
    state.devtoolsOpen = !!open;
    const panel = $('devtoolsPanel');
    panel.classList.toggle('hidden', !state.devtoolsOpen);
    $('devtoolsBtn').classList.toggle('active', state.devtoolsOpen);
    if (state.devtoolsOpen && MG.devtoolsUI) MG.devtoolsUI.open();
    updateLayout();
  }

  /* ---------------------------------------------------------------- */
  /* events from main                                                  */
  /* ---------------------------------------------------------------- */

  function applySettings(settings) {
    const prevLang = state.settings.language;
    const prevTheme = state.settings.theme;
    state.settings = settings || {};
    applyTheme();
    if (prevLang !== state.settings.language) {
      applyLanguage();
      if (MG.settingsUI && state.settingsOpen) MG.settingsUI.render();
    }
    if (prevTheme !== state.settings.theme && MG.settingsUI && state.settingsOpen) MG.settingsUI.render();
    renderToolbar();
    updateOmniboxPlaceholder();
  }

  function handleEvent(type, payload) {
    switch (type) {
      case 'tabs': {
        state.tabs = (payload.tabs || []).slice();
        state.activeId = payload.activeId;
        state.split = payload.split || null;
        renderTabs();
        renderToolbar();
        renderSplitBar();
        updateSplitDivider();
        break;
      }
      case 'tab': {
        const index = state.tabs.findIndex((tab) => tab.id === payload.id);
        if (index >= 0) state.tabs[index] = payload;
        else state.tabs.push(payload);
        updateTabNode(payload);
        if (payload.id === state.activeId) renderToolbar();
        if (state.split && (payload.id === state.split.left || payload.id === state.split.right)) renderSplitBar();
        break;
      }
      case 'active': {
        state.activeId = payload.id;
        renderTabs();
        renderToolbar();
        renderSplitBar();
        break;
      }
      case 'tab-closed': {
        state.tabs = state.tabs.filter((tab) => tab.id !== payload.id);
        renderTabs();
        break;
      }
      case 'split-state': {
        state.split = payload.split || null;
        renderTabs();
        renderSplitBar();
        updateSplitDivider();
        updateLayout();
        break;
      }
      case 'progress': {
        if (payload.id === state.activeId) showProgress(payload.value);
        break;
      }
      case 'settings': {
        applySettings(payload.settings);
        break;
      }
      case 'system-theme': {
        if (state.settings.theme === 'system') applyTheme();
        break;
      }
      case 'profile': {
        state.profile = payload.profile || {};
        updateAvatar();
        break;
      }
      case 'downloads': {
        const before = state.downloads.length;
        state.downloads = payload.items || [];
        updateDownloadsBadge();
        if (MG.panels && state.sidebar === 'downloads') MG.panels.renderSidebar();
        if (state.downloads.length > before) MG.toast(t('toast.downloadStarted'), 'info', 1600);
        break;
      }
      case 'bookmarks': {
        state.bookmarks = payload.bookmarks || [];
        const tab = activeTab();
        updateBookmarkButton(tab);
        break;
      }
      case 'bookmarked': {
        if (payload.bookmarked) MG.toast(t('toast.bookmarkAdded'), 'success', 1600);
        else MG.toast(t('toast.bookmarkRemoved'), 'info', 1600);
        if (MG.panels && state.sidebar === 'passwords') MG.panels.renderSidebar();
        break;
      }
      case 'history': {
        state.history = payload.history || [];
        break;
      }
      case 'password-prompt': {
        if (MG.panels) MG.panels.showPasswordPrompt(payload);
        break;
      }
      case 'permission-request': {
        showPermission(payload);
        break;
      }
      case 'find-result': {
        $('findCount').textContent = `${payload.active || 0}/${payload.matches || 0}`;
        break;
      }
      case 'devtools-event': {
        if (MG.devtoolsUI) MG.devtoolsUI.handleEvent(payload);
        break;
      }
      case 'devtools': {
        setDevtoolsOpen(!!payload.open);
        break;
      }
      case 'window-state': {
        state.maximized = !!payload.maximized;
        const icon = $('maximizeIcon');
        if (icon) icon.innerHTML = `<use href="#i-${state.maximized ? 'restore' : 'maximize'}"></use>`;
        break;
      }
      case 'fullscreen': {
        state.fullscreen = !!payload.value;
        $('app').classList.toggle('immersive', state.fullscreen);
        if (state.fullscreen) {
          MG.call('layout:insets', { top: 0, right: 0, bottom: 0, left: 0 });
        } else {
          updateLayout();
        }
        break;
      }
      case 'open-settings': {
        openSettings(payload.section);
        break;
      }
      case 'open-sidebar': {
        openSidebar(payload.view);
        break;
      }
      case 'shortcut': {
        runShortcut(payload.action);
        break;
      }
      case 'toast': {
        MG.toast(payload.message, payload.kind || 'info');
        break;
      }
      case 'demo-omnibox': {
        $('omnibox').focus();
        $('omnibox').value = payload.text || '';
        if (MG.omni) MG.omni.handleInput(payload.text || '');
        break;
      }
      case 'demo-close-omnibox': {
        if (MG.omni) MG.omni.close();
        $('omnibox').blur();
        break;
      }
      case 'demo-close-settings': {
        if (state.settingsOpen) closeSettings();
        break;
      }
      case 'tab-closed':
        break;
      default:
        break;
    }
  }

  /* ---------------------------------------------------------------- */
  /* shortcuts                                                         */
  /* ---------------------------------------------------------------- */

  function runShortcut(action) {
    const tab = activeTab();
    switch (action) {
      case 'newTab': MG.call('tabs:new', { url: 'mg://newtab', active: true }); break;
      case 'reopenTab': MG.call('tabs:reopen'); break;
      case 'closeTab': if (tab) MG.call('tabs:close', { id: tab.id }); break;
      case 'closeWindow': MG.call('app:close'); break;
      case 'focusOmnibox': if (MG.omni) MG.omni.focus(); break;
      case 'reload': MG.call('tabs:reload', { id: state.activeId }); break;
      case 'hardReload': MG.call('tabs:reload', { id: state.activeId, hard: true }); break;
      case 'find': toggleFindBar(true); break;
      case 'downloads': openSidebar(state.sidebar === 'downloads' ? null : 'downloads'); break;
      case 'bookmark': toggleBookmark(); break;
      case 'print': MG.call('tabs:print'); break;
      case 'settings': openSettings('general'); break;
      case 'split': MG.call('split:toggle'); break;
      case 'devtools': toggleDevtoolsPanel(); break;
      case 'zoomIn': MG.call('tabs:zoom', { delta: 0.5 }); break;
      case 'zoomOut': MG.call('tabs:zoom', { delta: -0.5 }); break;
      case 'zoomReset': MG.call('tabs:zoom', { delta: 0 }); break;
      case 'nextTab': {
        if (state.tabs.length < 2) break;
        const sorted = [...state.tabs].sort((a, b) => a.index - b.index);
        const idx = sorted.findIndex((x) => x.id === state.activeId);
        MG.call('tabs:activate', { id: sorted[(idx + 1) % sorted.length].id });
        break;
      }
      case 'prevTab': {
        if (state.tabs.length < 2) break;
        const sorted = [...state.tabs].sort((a, b) => a.index - b.index);
        const idx = sorted.findIndex((x) => x.id === state.activeId);
        MG.call('tabs:activate', { id: sorted[(idx - 1 + sorted.length) % sorted.length].id });
        break;
      }
      case 'back': MG.call('tabs:back', { id: state.activeId }); break;
      case 'forward': MG.call('tabs:forward', { id: state.activeId }); break;
      case 'fullscreen': MG.call('window:fullscreen', { value: !state.fullscreen }); break;
      case 'clearData': clearBrowsingData(); break;
      default: break;
    }
  }

  async function clearBrowsingData() {
    const confirmed = confirm(t('settings.clearHistoryHint'));
    if (!confirmed) return;
    await MG.call('history:clear');
    MG.toast(t('toast.historyCleared'), 'success');
  }

  function toggleBookmark() {
    const tab = activeTab();
    if (!tab || !/^https?:/i.test(tab.url || '')) return;
    MG.call('bookmarks:toggle', { url: tab.url, title: tab.title, favicon: tab.favicon });
  }

  /* ---------------------------------------------------------------- */
  /* bind                                                              */
  /* ---------------------------------------------------------------- */

  function bindWindowControls() {
    document.querySelectorAll('[data-win]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.win;
        if (action === 'minimize') MG.call('app:minimize');
        if (action === 'maximize') MG.call('app:maximize').then((value) => {
          state.maximized = !!value;
          const icon = $('maximizeIcon');
          if (icon) icon.innerHTML = `<use href="#i-${state.maximized ? 'restore' : 'maximize'}"></use>`;
          updateLayout();
        });
        if (action === 'close') MG.call('app:close');
      });
    });
    $('titlebar').addEventListener('dblclick', (event) => {
      if (event.target.closest('button')) return;
      MG.call('app:maximize');
    });
  }

  function bindToolbar() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        const tab = activeTab();
        if (!tab) return;
        if (nav === 'back') MG.call('tabs:back', { id: tab.id });
        if (nav === 'forward') MG.call('tabs:forward', { id: tab.id });
        if (nav === 'reload') {
          if (tab.loading) MG.call('tabs:stop', { id: tab.id });
          else MG.call('tabs:reload', { id: tab.id });
        }
        if (nav === 'home') MG.call('tabs:navigate', { id: tab.id, url: state.settings.homepage || 'mg://newtab' });
      });
    });
    $('newTabBtn').addEventListener('click', () => MG.call('tabs:new', { url: 'mg://newtab', active: true }));
    $('splitBtn').addEventListener('click', () => MG.call('split:toggle'));
    $('downloadsBtn').addEventListener('click', () => toggleSidebar('downloads'));
    $('passwordsBtn').addEventListener('click', () => toggleSidebar('passwords'));
    $('devtoolsBtn').addEventListener('click', toggleDevtoolsPanel);
    $('avatarBtn').addEventListener('click', () => MG.call('profile:menu'));
    $('menuBtn').addEventListener('click', () => MG.call('menu:main'));
    $('bookmarkBtn').addEventListener('click', toggleBookmark);
    $('splitCloseBtn').addEventListener('click', () => MG.call('split:close'));
    $('splitSwapBtn').addEventListener('click', () => MG.call('split:swap'));
    $('splitLeftInfo').addEventListener('click', () => state.split && MG.call('split:focus', { id: state.split.left }));
    $('splitRightInfo').addEventListener('click', () => state.split && MG.call('split:focus', { id: state.split.right }));
    $('tabSearchBtn').addEventListener('click', () => MG.omni && MG.omni.showTabSwitcher());

    $('findInput').addEventListener('input', (event) => {
      const text = event.target.value;
      if (!text) { MG.call('tabs:findStop'); $('findCount').textContent = '0/0'; return; }
      MG.call('tabs:find', { text, findNext: false });
    });
    $('findInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        MG.call('tabs:find', {
          text: event.target.value,
          forward: !event.shiftKey,
          findNext: true
        });
      }
      if (event.key === 'Escape') toggleFindBar(false);
    });
    $('findNext').addEventListener('click', () => MG.call('tabs:find', { text: $('findInput').value, forward: true, findNext: true }));
    $('findPrev').addEventListener('click', () => MG.call('tabs:find', { text: $('findInput').value, forward: false, findNext: true }));
    $('findClose').addEventListener('click', () => toggleFindBar(false));

    window.addEventListener('resize', updateLayout);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => updateLayout());
      ro.observe($('header'));
    }
  }

  function bindSplitDivider() {
    const divider = $('splitDivider');
    let dragging = false;
    let raf = null;
    divider.addEventListener('pointerdown', (event) => {
      if (!state.split) return;
      dragging = true;
      divider.classList.add('dragging');
      divider.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    divider.addEventListener('pointermove', (event) => {
      if (!dragging || !state.split) return;
      const geo = contentGeometry();
      const lead = getComputedStyle(document.documentElement).direction === 'rtl'
        ? geo.x + geo.width - (event.clientX - geo.x)
        : event.clientX - geo.x;
      const ratio = MG.clamp((lead - 5) / (geo.width - 10), 0.2, 0.8);
      state.split.ratio = ratio;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        updateSplitDivider();
        renderSplitBar();
        MG.call('split:ratio', { ratio });
      });
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('dragging');
    };
    divider.addEventListener('pointerup', end);
    divider.addEventListener('pointercancel', end);
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (state.settingsOpen) { closeSettings(); return; }
        if (MG.omni && MG.omni.isOpen()) { MG.omni.close(); return; }
        if (!$('findbar').classList.contains('hidden')) { toggleFindBar(false); return; }
      }
    });
  }

  function bindGlobalDragDrop() {
    document.addEventListener('dragover', (event) => {
      if (event.dataTransfer && [...event.dataTransfer.types].includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    });
    document.addEventListener('drop', (event) => {
      if (!event.dataTransfer) return;
      const files = [...event.dataTransfer.files];
      if (!files.length) return;
      event.preventDefault();
      const fileUrl = 'file://' + files[0].path.replace(/\\/g, '/');
      MG.call('tabs:new', { url: fileUrl, active: true });
    });
  }

  /* ---------------------------------------------------------------- */
  /* boot                                                              */
  /* ---------------------------------------------------------------- */

  async function boot() {
    const init = await MG.call('app:init');
    if (init && init.error) {
      MG.toast('Failed to initialize: ' + init.error, 'error', 6000);
      return;
    }
    state.settings = init.settings || {};
    state.profile = init.profile || {};
    state.engines = init.engines || [];
    state.downloads = init.downloads || [];
    state.bookmarks = init.bookmarks || [];
    state.history = init.history || [];
    state.platform = init.platform;
    state.isMac = !!init.isMac;
    state.versions = init.versions || {};
    state.userData = init.userData || '';
    state.maximized = !!init.maximized;
    if (init.tabs) {
      state.tabs = init.tabs.tabs || [];
      state.activeId = init.tabs.activeId;
      state.split = init.tabs.split || null;
    }

    setPlatformClasses();
    MG.i18n.setLang(state.settings.language || 'en');
    applyTheme();
    applyLanguage();
    state.tabSignature = '';
    renderTabs();
    renderToolbar();
    renderSplitBar();
    updateAvatar();
    updateDownloadsBadge();
    updateSidebarVisibility();

    if (MG.omni) MG.omni.init();
    if (MG.panels) MG.panels.init();
    if (MG.settingsUI) MG.settingsUI.init();
    if (MG.devtoolsUI) MG.devtoolsUI.init();

    bindWindowControls();
    bindToolbar();
    bindSplitDivider();
    bindKeyboard();
    bindGlobalDragDrop();

    window.mg.onEvent(handleEvent);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((state.settings.theme || 'system') === 'system') applyTheme();
    });

    updateLayout();
    setTimeout(updateLayout, 60);
    setTimeout(updateLayout, 250);
  }

  MG.openSettings = openSettings;
  MG.closeSettings = closeSettings;
  MG.openSidebar = openSidebar;
  MG.toggleSidebar = toggleSidebar;
  MG.closeSidebar = () => { state.sidebar = null; updateSidebarVisibility(); updateLayout(); };
  MG.toggleDevtoolsPanel = toggleDevtoolsPanel;
  MG.updateLayout = updateLayout;
  MG.activeTab = activeTab;
  MG.tabById = tabById;
  MG.toggleBookmark = toggleBookmark;
  MG.applyTheme = applyTheme;
  MG.applyLanguage = applyLanguage;
  MG.renderTabs = renderTabs;
  MG.renderToolbar = renderToolbar;
  MG.renderSplitBar = renderSplitBar;
  MG.runShortcut = runShortcut;
  MG.hideSaveBar = hideSaveBar;
  MG.showSaveBar = showSaveBar;
  MG.toggleFindBar = toggleFindBar;

  document.addEventListener('DOMContentLoaded', boot);
})();
