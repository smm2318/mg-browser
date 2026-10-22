'use strict';

(function () {
  const MG = window.MG;
  const $ = (id) => document.getElementById(id);

  const CONTEXT_LABELS = {
    back: ['Back', 'عقب'],
    forward: ['Forward', 'جلو'],
    reload: ['Reload', 'بارگذاری مجدد'],
    savePage: ['Save page as…', 'ذخیره صفحه'],
    viewSource: ['View page source', 'نمایش سورس صفحه'],
    print: ['Print…', 'چاپ'],
    copy: ['Copy', 'کپی'],
    paste: ['Paste', 'چسباندن'],
    selectAll: ['Select all', 'انتخاب همه'],
    copyLink: ['Copy link address', 'کپی نشانی پیوند'],
    openLinkNewTab: ['Open link in new tab', 'باز کردن پیوند در تب جدید'],
    openLinkSplit: ['Open link in split view', 'باز کردن پیوند در نمای تقسیم‌شده'],
    saveLink: ['Save link as…', 'ذخیره پیوند'],
    copyImage: ['Copy image', 'کپی تصویر'],
    copyImageAddress: ['Copy image address', 'کپی نشانی تصویر'],
    saveImage: ['Save image as…', 'ذخیره تصویر'],
    searchSelection: ['Search for selection', 'جستجوی متن انتخاب‌شده'],
    translateSelection: ['Translate selection', 'ترجمه متن انتخاب‌شده'],
    copyAsMarkdown: ['Copy as Markdown', 'کپی به‌صورت Markdown'],
    inspect: ['Inspect element (MG DevTools)', 'بررسی عنصر (ابزار MG)'],
    inspectNative: ['Inspect element (native)', 'بررسی عنصر (بومی)'],
    customActions: ['Custom actions submenu', 'زیرمنوی اکشن‌های سفارشی']
  };

  const settingsUI = {
    section: 'general',
    historyItems: [],
    historyLoaded: false,
    passwordCount: 0,
    extensionItems: [],
    extensionsLoaded: false,
    generatorValue: '',

    init() {
      const overlay = $('settingsOverlay');
      overlay.addEventListener('click', (event) => this.onClick(event));
      overlay.addEventListener('input', (event) => this.onInput(event));
      overlay.addEventListener('change', (event) => this.onChange(event));
    },

    open(section) {
      this.section = section || this.section || 'general';
      this.render();
      this.loadSectionData();
    },

    close() {
      this.historyLoaded = false;
    },

    navItems() {
      return [
        { id: 'general', icon: 'sliders', label: MG.t('settings.general') },
        { id: 'appearance', icon: 'palette', label: MG.t('settings.appearance') },
        { id: 'search', icon: 'search', label: MG.t('settings.search') },
        { id: 'privacy', icon: 'shield', label: MG.t('settings.privacy') },
        { id: 'downloads', icon: 'download', label: MG.t('settings.downloads') },
        { id: 'passwords', icon: 'key', label: MG.t('settings.passwords') },
        { id: 'extensions', icon: 'puzzle', label: MG.t('settings.extensions') },
        { id: 'languages', icon: 'language', label: MG.t('settings.languages') },
        { id: 'contextmenu', icon: 'list', label: MG.t('settings.contextmenu') },
        { id: 'shortcuts', icon: 'keyboard', label: MG.t('settings.shortcuts') },
        { id: 'history', icon: 'history', label: MG.t('settings.history') },
        { id: 'about', icon: 'info', label: MG.t('settings.about') }
      ];
    },

    render() {
      const overlay = $('settingsOverlay');
      const nav = this.navItems().map((item) =>
        `<button class="settings-nav-item ${item.id === this.section ? 'active' : ''}" data-section="${item.id}">
          ${MG.icon(item.icon)}<span>${MG.esc(item.label)}</span>
        </button>`
      ).join('');
      overlay.innerHTML = `
        <div class="settings-top">
          <img src="assets/logo.svg" class="brand-logo" style="width:24px;height:24px;border-radius:7px" alt="">
          <div class="settings-heading">${MG.esc(MG.t('settings.title'))} <span>·</span> MG</div>
          <div class="settings-search">
            ${MG.icon('search')}
            <input id="settingsSearch" type="text" placeholder="${MG.esc(MG.t('common.search'))}…">
          </div>
          <button class="tool-btn" data-settings-action="close" title="${MG.esc(MG.t('common.close'))}">${MG.icon('close')}</button>
        </div>
        <div class="settings-body">
          <nav class="settings-nav">${nav}</nav>
          <div class="settings-content" id="settingsContent"><div class="settings-inner" id="settingsInner">${this.renderSection()}</div></div>
        </div>`;
      this.bindSearch();
    },

    renderSection() {
      switch (this.section) {
        case 'appearance': return this.renderAppearance();
        case 'search': return this.renderSearch();
        case 'privacy': return this.renderPrivacy();
        case 'downloads': return this.renderDownloads();
        case 'passwords': return this.renderPasswords();
        case 'extensions': return this.renderExtensions();
        case 'languages': return this.renderLanguages();
        case 'contextmenu': return this.renderContextMenu();
        case 'shortcuts': return this.renderShortcuts();
        case 'history': return this.renderHistory();
        case 'about': return this.renderAbout();
        default: return this.renderGeneral();
      }
    },

    row(title, hint, control) {
      return `<div class="row">
        <div class="row-main">
          <div class="row-title">${MG.esc(title)}</div>
          ${hint ? `<div class="row-hint">${MG.esc(hint)}</div>` : ''}
        </div>
        <div class="row-control">${control}</div>
      </div>`;
    },

    toggle(key, value) {
      return `<button class="switch ${value ? 'on' : ''}" role="switch" aria-checked="${value ? 'true' : 'false'}" data-toggle="${MG.esc(key)}"></button>`;
    },

    renderGeneral() {
      const s = MG.state.settings;
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.general'))}</div>
        <div class="card">
          ${this.row(MG.t('settings.restoreSession'), MG.t('settings.restoreSessionHint'), this.toggle('restoreSession', !!s.restoreSession))}
          ${this.row(MG.t('settings.startPage'), MG.t('settings.startPageHint'), '<span class="path-display">mg://newtab</span>')}
          ${this.row(MG.t('settings.suggestions'), MG.t('settings.suggestionsHint'), this.toggle('omniboxSuggestions', s.omniboxSuggestions !== false))}
          ${this.row(MG.t('settings.showTabTooltips'), MG.t('settings.showTabTooltipsHint'), this.toggle('showTabTooltips', s.showTabTooltips !== false))}
        </div>
        <div class="settings-section-title">${MG.esc(MG.t('settings.reset'))}</div>
        <div class="card">
          ${this.row(MG.t('settings.reset'), MG.t('settings.resetHint'), `<button class="btn danger" data-settings-action="reset">${MG.esc(MG.t('settings.reset'))}</button>`)}
        </div>
        <div class="settings-footer-note">MG Browser ${MG.esc(MG.state.versions.app || '')} · ${MG.esc(MG.state.versions.chrome || '')}</div>`;
    },

    renderAppearance() {
      const s = MG.state.settings;
      const theme = s.theme || 'system';
      const themes = [
        { id: 'light', label: MG.t('settings.light'), icon: 'sun' },
        { id: 'dark', label: MG.t('settings.dark'), icon: 'moon' },
        { id: 'system', label: MG.t('settings.system'), icon: 'monitor' }
      ];
      const cards = themes.map((item) => `
        <button class="theme-card ${theme === item.id ? 'active' : ''}" data-theme-set="${item.id}">
          <span class="theme-preview ${item.id}"><i class="bar"></i><i class="side"></i><i class="tile"></i></span>
          <span class="theme-label">${MG.icon(item.icon)}${MG.esc(item.label)}</span>
        </button>`).join('');
      const accents = ['#7c5cff', '#22d3ee', '#34d399', '#f472b6', '#f59e0b', '#ef4444', '#60a5fa', '#a78bfa', '#94a3b8']
        .map((color) => `<button class="swatch ${s.accent === color ? 'active' : ''}" data-accent="${color}" style="background:${color}" title="${color}"></button>`)
        .join('');
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.theme'))}</div>
        <div class="theme-cards">${cards}</div>
        <div class="card">
          ${this.row(MG.t('settings.theme'), MG.t('settings.themeHint'), `<span class="path-display">${MG.esc(MG.t('settings.' + theme))}</span>`)}
          ${this.row(MG.t('settings.accent'), MG.t('settings.accentHint'), `<div class="accent-swatches">${accents}</div>`)}
          ${this.row(MG.t('settings.compactTabs'), MG.t('settings.compactTabsHint'), this.toggle('compactTabs', !!s.compactTabs))}
          ${this.row(MG.t('settings.smoothScrolling'), MG.t('settings.smoothScrollingHint'), this.toggle('smoothScrolling', s.smoothScrolling !== false))}
        </div>`;
    },

    renderSearch() {
      const s = MG.state.settings;
      const engines = MG.state.engines || [];
      const cards = engines.map((engine) => `
        <div class="engine-card ${engine.id === s.searchEngine ? 'active' : ''}" data-engine-set="${MG.esc(engine.id)}">
          <span class="engine-glyph" style="--engine-color:${MG.esc(engine.color || '#7c5cff')}">${MG.esc(engine.glyph || engine.name.charAt(0))}</span>
          <span class="engine-card-name">${MG.esc(engine.name)}</span>
          ${engine.id === s.searchEngine ? `<svg class="icon engine-card-check"><use href="#i-check"></use></svg>` : ''}
        </div>`).join('');
      const custom = (s.customSearchEngines || []).map((engine, index) => `
        <div class="custom-action-row">
          <span class="engine-glyph" style="--engine-color:${MG.esc(engine.color || '#7c5cff')};width:22px;height:22px;font-size:10px">${MG.esc((engine.name || 'C').charAt(0))}</span>
          <strong>${MG.esc(engine.name)}</strong>
          <code>${MG.esc(engine.url)}</code>
          <button class="tool-btn small" data-remove-engine="${index}" title="${MG.esc(MG.t('common.delete'))}">${MG.icon('trash')}</button>
        </div>`).join('');
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.searchEngine'))}</div>
        <div class="card" style="padding-bottom:6px">
          <div class="row" style="display:block;padding-bottom:4px"><div class="row-hint">${MG.esc(MG.t('settings.searchEngineHint'))}</div></div>
          <div class="engine-list">${cards}</div>
        </div>
        <div class="card">
          ${this.row(MG.t('settings.liveResults'), MG.t('settings.liveResultsHint'), this.toggle('liveResults', s.liveResults !== false))}
          ${this.row(MG.t('settings.suggestions'), MG.t('settings.suggestionsHint'), this.toggle('omniboxSuggestions', s.omniboxSuggestions !== false))}
        </div>
        <div class="settings-section-title">${MG.esc(MG.t('settings.customEngine'))}</div>
        <div class="card">
          <div class="custom-action-form">
            <label>${MG.esc(MG.t('settings.customEngineName'))}<input class="input" id="engineName" placeholder="My search"></label>
            <label style="flex:1">${MG.esc(MG.t('settings.customEngineUrl'))}<input class="input" id="engineUrl" style="width:100%" placeholder="https://example.com/search?q={q}"></label>
            <button class="btn primary" data-settings-action="add-engine">${MG.esc(MG.t('common.add'))}</button>
          </div>
          <div class="custom-actions-list">${custom || `<div class="row-hint" style="padding-bottom:14px">${MG.esc(MG.t('settings.customEngineUrl'))}: {q}</div>`}</div>
        </div>`;
    },

    renderPrivacy() {
      const s = MG.state.settings;
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.privacy'))}</div>
        <div class="card">
          ${this.row(MG.t('settings.doNotTrack'), 'Sends the DNT: 1 request header.', this.toggle('doNotTrack', s.doNotTrack !== false))}
          ${this.row(MG.t('settings.blockTrackers'), MG.t('settings.blockTrackersHint'), this.toggle('blockTrackers', !!s.blockTrackers))}
        </div>
        <div class="settings-section-title">${MG.esc(MG.t('settings.clearHistory'))}</div>
        <div class="card">
          ${this.row(MG.t('settings.clearHistory'), MG.t('settings.clearHistoryHint'), `<button class="btn danger" data-settings-action="clear-history">${MG.esc(MG.t('common.clear'))}</button>`)}
        </div>`;
    },

    renderDownloads() {
      const s = MG.state.settings;
      const items = MG.state.downloads || [];
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.downloads'))}</div>
        <div class="card">
          ${this.row(MG.t('settings.askDownloadPath'), 'Show a save dialog for every download.', this.toggle('askDownloadPath', s.askDownloadPath !== false))}
          ${this.row(MG.t('settings.downloadFolder'),
            s.downloadPath || 'System default',
            `<span class="path-display">${MG.esc(s.downloadPath || 'Downloads')}</span><button class="btn" data-settings-action="choose-folder">${MG.esc(MG.t('settings.chooseFolder'))}</button>`)}
          ${this.row(MG.t('downloads.clear'), MG.t('downloads.count', { count: items.length }),
            `<button class="btn danger" data-settings-action="clear-downloads">${MG.esc(MG.t('common.clear'))}</button>`)}
        </div>`;
    },

    renderPasswords() {
      const s = MG.state.settings;
      return `
        <div class="settings-section-title">${MG.esc(MG.t('passwords.vault'))}</div>
        <div class="card">
          ${this.row(MG.t('settings.savePasswords'), MG.t('settings.savePasswordsHint'), this.toggle('savePasswords', s.savePasswords !== false))}
          ${this.row(MG.t('settings.autofill'), MG.t('settings.autofillHint'), this.toggle('autofillPasswords', s.autofillPasswords !== false))}
          ${this.row(MG.t('passwords.title'), MG.t('passwords.count', { count: this.passwordCount }),
            `<button class="btn" data-settings-action="open-vault">${MG.icon('key')}${MG.esc(MG.t('common.open'))}</button>`)}
        </div>
        <div class="settings-section-title">${MG.esc(MG.t('passwords.generator'))}</div>
        <div class="card">
          <div class="row" style="display:block">
            <div class="gen-output"><span id="settingsGenValue">${MG.esc(this.generatorValue || '—')}</span>
              <button class="tool-btn small" data-settings-action="gen-copy" title="${MG.esc(MG.t('common.copy'))}">${MG.icon('copy')}</button>
            </div>
            <button class="btn" data-settings-action="gen-generate">${MG.icon('sparkles')}${MG.esc(MG.t('passwords.generate'))}</button>
          </div>
        </div>`;
    },

    renderExtensions() {
      const exts = this.extensionItems || [];
      const rows = exts.map((ext) => {
        const initial = MG.esc((ext.name || 'E').trim().charAt(0).toUpperCase());
        return `<div class="ext-item ${ext.enabled === false ? 'disabled' : ''}">
          <div class="ext-icon">${initial}</div>
          <div class="ext-main">
            <div class="ext-name">${MG.esc(ext.name || ext.path)}
              ${ext.version ? `<span class="ext-version">v${MG.esc(ext.version)}</span>` : ''}
              ${ext.error ? `<span class="ext-error">${MG.esc(MG.t('settings.extensionsError'))}</span>` : ''}
            </div>
            <div class="ext-path" title="${MG.esc(ext.path)}">${MG.esc(ext.path)}</div>
            ${ext.error ? `<div class="ext-error-text">${MG.esc(ext.error)}</div>` : ''}
          </div>
          <div class="ext-actions">
            <button class="switch ${ext.enabled !== false ? 'on' : ''}" data-ext-toggle="${MG.esc(ext.id || ext.path)}" title="${MG.esc(ext.enabled !== false ? MG.t('settings.extensionsEnabled') : MG.t('settings.extensionsDisabled'))}"></button>
            <button class="tool-btn small" data-ext-action="reload" data-ext-id="${MG.esc(ext.id || ext.path)}" title="${MG.esc(MG.t('settings.extensionsReload'))}">${MG.icon('reload')}</button>
            <button class="tool-btn small" data-ext-action="folder" data-ext-id="${MG.esc(ext.id || ext.path)}" title="${MG.esc(MG.t('settings.extensionsFolder'))}">${MG.icon('folder')}</button>
            <button class="tool-btn small" data-ext-action="remove" data-ext-id="${MG.esc(ext.id || ext.path)}" title="${MG.esc(MG.t('settings.extensionsRemove'))}">${MG.icon('trash')}</button>
          </div>
        </div>`;
      }).join('');

      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.extensions'))}</div>
        <div class="card">
          <div class="row" style="display:block">
            <div class="row-hint">${MG.esc(MG.t('settings.extensionsHint'))}</div>
            <div class="ext-toolbar">
              <button class="btn primary" data-settings-action="add-extension">${MG.icon('plus')}${MG.esc(MG.t('settings.extensionsAdd'))}</button>
              <button class="btn" data-settings-action="reload-tabs">${MG.icon('reload')}${MG.esc(MG.t('settings.extensionsReloadTabs'))}</button>
            </div>
          </div>
          ${exts.length ? `<div class="ext-list">${rows}</div>` : `<div class="settings-empty">${MG.esc(MG.t('settings.extensionsEmpty'))}<div class="row-hint" style="margin-top:5px">${MG.esc(MG.t('settings.extensionsEmptyHint'))}</div></div>`}
          <div class="ext-warning">${MG.icon('shield')}<span>${MG.esc(MG.t('settings.extensionsWarning'))}</span></div>
        </div>`;
    },

    renderLanguages() {
      const lang = MG.state.settings.language || 'en';
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.language'))}</div>
        <div class="card">
          <div class="row">
            <div class="row-main"><div class="row-title">${MG.esc(MG.t('settings.language'))}</div>
              <div class="row-hint">${MG.esc(MG.t('settings.languageHint'))}</div></div>
            <div class="row-control">
              <div class="segmented">
                <button class="${lang === 'en' ? 'active' : ''}" data-lang-set="en">${MG.esc(MG.t('settings.english'))}</button>
                <button class="${lang === 'fa' ? 'active' : ''}" data-lang-set="fa">${MG.esc(MG.t('settings.persian'))}</button>
              </div>
            </div>
          </div>
        </div>
        <div class="settings-footer-note">${MG.esc(MG.t('app.tagline'))}</div>`;
    },

    renderContextMenu() {
      const cfg = MG.state.settings.contextMenu || {};
      const checks = Object.entries(CONTEXT_LABELS).map(([key, labels]) => {
        const label = MG.i18n.getLang() === 'fa' ? labels[1] : labels[0];
        return `<label class="toggle-item"><input type="checkbox" data-context-toggle="${key}" ${cfg[key] !== false ? 'checked' : ''}><span>${MG.esc(label)}</span></label>`;
      }).join('');
      const actions = (MG.state.settings.customContextActions || []).map((action, index) => `
        <div class="custom-action-row">
          <strong>${MG.esc(action.label)}</strong>
          <code>${MG.esc(action.urlTemplate)}</code>
          <button class="tool-btn small" data-remove-action="${index}" title="${MG.esc(MG.t('common.delete'))}">${MG.icon('trash')}</button>
        </div>`).join('');
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.contextmenu'))}</div>
        <div class="card">
          <div class="row" style="display:block">
            <div class="row-hint" style="margin-bottom:4px">${MG.esc(MG.t('settings.contextMenuHint'))}</div>
          </div>
          <div class="toggle-grid">${checks}</div>
          <div style="padding:0 0 14px"><button class="btn ghost" data-settings-action="reset-context">${MG.esc(MG.t('settings.contextMenuReset'))}</button></div>
        </div>
        <div class="settings-section-title">${MG.esc(MG.t('settings.customActions'))}</div>
        <div class="card">
          <div class="row" style="display:block"><div class="row-hint">${MG.esc(MG.t('settings.customActionsHint'))}</div></div>
          <div class="custom-action-form">
            <label>${MG.esc(MG.t('settings.actionLabel'))}<input class="input" id="actionLabel" placeholder="Search IMDB"></label>
            <label style="flex:1">${MG.esc(MG.t('settings.actionUrl'))}<input class="input" id="actionUrl" style="width:100%" placeholder="https://www.imdb.com/find?q=%s"></label>
            <button class="btn primary" data-settings-action="add-action">${MG.esc(MG.t('settings.addAction'))}</button>
          </div>
          <div class="custom-actions-list">${actions || ''}</div>
        </div>`;
    },

    renderShortcuts() {
      const rows = [
        [MG.t('settings.shortcutNewTab'), 'Ctrl + T'],
        [MG.t('settings.shortcutCloseTab'), 'Ctrl + W'],
        [MG.t('settings.shortcutReopen'), 'Ctrl + Shift + T'],
        [MG.t('settings.shortcutOmnibox'), 'Ctrl + L'],
        [MG.t('settings.shortcutFind'), 'Ctrl + F'],
        [MG.t('settings.shortcutDownloads'), 'Ctrl + J'],
        [MG.t('settings.shortcutBookmark'), 'Ctrl + D'],
        [MG.t('settings.shortcutSplit'), 'Ctrl + Shift + S'],
        [MG.t('settings.shortcutDevtools'), 'F12'],
        [MG.t('settings.shortcutSettings'), 'Ctrl + ,'],
        [MG.t('settings.shortcutZoom'), 'Ctrl + + / − / 0'],
        [MG.t('settings.shortcutNextTab'), 'Ctrl + Tab'],
        [MG.t('settings.shortcutHardReload'), 'Ctrl + Shift + R'],
        [MG.t('common.back') + ' / ' + MG.t('common.forward'), 'Alt + ← / →']
      ].map(([label, keys]) => `<tr><td>${MG.esc(label)}</td><td>${keys.split(' / ').map((k) => `<kbd>${MG.esc(k)}</kbd>`).join(' ')}</td></tr>`).join('');
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.shortcuts'))}</div>
        <div class="card" style="padding:4px 18px 8px">
          <div class="row-hint" style="padding-top:10px">${MG.esc(MG.t('settings.shortcutsHint'))}</div>
          <table class="shortcut-table">${rows}</table>
        </div>`;
    },

    renderHistory() {
      const items = this.historyItems || [];
      const list = items.length ? items.map((item) => `
        <div class="history-item">
          <span class="tab-favicon">${MG.faviconHtml({ url: item.url, favicon: item.favicon })}</span>
          <span class="history-main">
            <span class="history-title">${MG.esc(item.title || item.url)}</span>
            <span class="history-url">${MG.esc(MG.prettyUrl(item.url))}</span>
          </span>
          <span class="history-time">${MG.esc(MG.timeAgo(item.visitedAt))}</span>
          <button class="tool-btn small" data-history-remove="${MG.esc(item.url)}" title="${MG.esc(MG.t('common.delete'))}">${MG.icon('trash')}</button>
        </div>`).join('') : `<div class="settings-empty">${MG.esc(MG.t('settings.historyEmpty'))}</div>`;
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.history'))}</div>
        <div class="card">
          <div class="row" style="display:block">
            <div class="sidebar-search" style="margin:0 0 8px">${MG.icon('search')}<input id="historySearch" type="text" placeholder="${MG.esc(MG.t('settings.historySearch'))}"></div>
            <div class="history-list" id="historyList">${list}</div>
          </div>
          <div style="padding:0 0 14px;display:flex;gap:8px">
            <button class="btn danger" data-settings-action="clear-history">${MG.esc(MG.t('settings.clearHistory'))}</button>
          </div>
        </div>`;
    },

    renderAbout() {
      return `
        <div class="settings-section-title">${MG.esc(MG.t('settings.about'))}</div>
        <div class="card">
          <div class="about-card">
            <img src="assets/logo.svg" class="about-logo" alt="MG Browser">
            <div>
              <div class="about-name">MG Browser</div>
              <div class="about-version">${MG.esc(MG.t('settings.version'))} ${MG.esc(MG.state.versions.app || '1.0.0')} · Chromium ${MG.esc(MG.state.versions.chrome || '')}</div>
              <div class="about-desc">${MG.esc(MG.t('settings.aboutText'))}</div>
            </div>
          </div>
        </div>
        <div class="about-meta">
          <div class="meta-tile"><div class="meta-label">${MG.esc(MG.t('settings.electron'))}</div><div class="meta-value">${MG.esc(MG.state.versions.electron || '')}</div></div>
          <div class="meta-tile"><div class="meta-label">${MG.esc(MG.t('settings.node'))}</div><div class="meta-value">${MG.esc(MG.state.versions.node || '')}</div></div>
          <div class="meta-tile"><div class="meta-label">${MG.esc(MG.t('settings.chromium'))}</div><div class="meta-value">${MG.esc((MG.state.versions.chrome || '').split('.')[0] || '')}</div></div>
        </div>
        <div class="card">
          ${this.row(MG.t('settings.dataFolder'), MG.state.userData, `<span class="path-display" title="${MG.esc(MG.state.userData)}">${MG.esc(MG.state.userData)}</span>`)}
        </div>
        <div class="settings-footer-note">${MG.esc(MG.t('app.tagline'))} · Made with Electron</div>`;
    },

    bindSearch() {
      const input = $('settingsSearch');
      if (!input) return;
      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        const content = $('settingsContent');
        if (!content) return;
        content.querySelectorAll('.row, .toggle-item, .engine-card, .custom-action-row, .history-item, .shortcut-table tr, .theme-card').forEach((row) => {
          row.style.display = !query || row.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
        content.querySelectorAll('.card').forEach((card) => {
          const visible = [...card.querySelectorAll('.row, .toggle-item, .engine-card, .custom-action-row')].some((row) => row.style.display !== 'none');
          card.style.display = !query || visible ? '' : 'none';
        });
      });
    },

    async loadSectionData() {
      if (this.section === 'history') {
        const items = await MG.call('history:list', { query: '' });
        this.historyItems = Array.isArray(items) ? items : [];
        this.render();
      }
      if (this.section === 'passwords') {
        const list = await MG.call('passwords:list');
        this.passwordCount = Array.isArray(list) ? list.length : 0;
        this.render();
      }
      if (this.section === 'extensions') {
        const list = await MG.call('extensions:list');
        this.extensionItems = Array.isArray(list) ? list : [];
        this.extensionsLoaded = true;
        this.render();
      }
    },

    async setSetting(key, value) {
      MG.state.settings[key] = value;
      await MG.call('settings:set', { [key]: value });
      MG.state.settings = (await MG.call('settings:get')) || MG.state.settings;
      if (key === 'theme' || key === 'accent' || key === 'language') {
        MG.applyTheme();
        if (key === 'language') MG.applyLanguage();
      }
      this.render();
    },

    async setNested(key, value) {
      const contextMenu = { ...(MG.state.settings.contextMenu || {}), [key]: value };
      MG.state.settings.contextMenu = contextMenu;
      await MG.call('settings:set', { contextMenu });
      this.render();
    },

    async onClick(event) {
      const section = event.target.closest('[data-section]');
      if (section) {
        this.section = section.dataset.section;
        this.render();
        this.loadSectionData();
        return;
      }

      const extToggle = event.target.closest('[data-ext-toggle]');
      if (extToggle) {
        const id = extToggle.dataset.extToggle;
        const ext = (this.extensionItems || []).find((e) => (e.id || e.path) === id);
        if (!ext) return;
        const list = await MG.call('extensions:toggle', { id, enabled: ext.enabled === false });
        this.extensionItems = Array.isArray(list) ? list : await MG.call('extensions:list');
        this.render();
        return;
      }

      const extAction = event.target.closest('[data-ext-action]');
      if (extAction) {
        const id = extAction.dataset.extId;
        const action = extAction.dataset.extAction;
        if (action === 'folder') {
          await MG.call('extensions:openFolder', { id });
        } else if (action === 'remove') {
          if (!confirm(MG.t('settings.extensionsRemove') + '?')) return;
          await MG.call('extensions:remove', { id });
          this.extensionItems = await MG.call('extensions:list');
          this.render();
          MG.toast(MG.t('settings.extensionsRemoved'), 'success', 1600);
        } else if (action === 'reload') {
          const list = await MG.call('extensions:reload', { id });
          this.extensionItems = Array.isArray(list) ? list : await MG.call('extensions:list');
          this.render();
        }
        return;
      }
      const theme = event.target.closest('[data-theme-set]');
      if (theme) { await this.setSetting('theme', theme.dataset.themeSet); return; }

      const accent = event.target.closest('[data-accent]');
      if (accent) { await this.setSetting('accent', accent.dataset.accent); return; }

      const lang = event.target.closest('[data-lang-set]');
      if (lang) { await this.setSetting('language', lang.dataset.langSet); return; }

      const engine = event.target.closest('[data-engine-set]');
      if (engine) {
        await this.setSetting('searchEngine', engine.dataset.engineSet);
        MG.renderToolbar();
        return;
      }

      const toggle = event.target.closest('[data-toggle]');
      if (toggle) {
        const key = toggle.dataset.toggle;
        await this.setSetting(key, !MG.state.settings[key]);
        return;
      }

      const removeEngine = event.target.closest('[data-remove-engine]');
      if (removeEngine) {
        const index = Number(removeEngine.dataset.removeEngine);
        const engines = (MG.state.settings.customSearchEngines || []).filter((_, i) => i !== index);
        await this.setSetting('customSearchEngines', engines);
        await this.refreshEngines();
        return;
      }

      const removeAction = event.target.closest('[data-remove-action]');
      if (removeAction) {
        const index = Number(removeAction.dataset.removeAction);
        const list = (MG.state.settings.customContextActions || []).filter((_, i) => i !== index);
        await this.setSetting('customContextActions', list);
        return;
      }

      const historyRemove = event.target.closest('[data-history-remove]');
      if (historyRemove) {
        await MG.call('history:remove', { url: historyRemove.dataset.historyRemove });
        this.historyItems = await MG.call('history:list', { query: '' });
        this.render();
        return;
      }

      const action = event.target.closest('[data-settings-action]');
      if (!action) return;
      const kind = action.dataset.settingsAction;

      switch (kind) {
        case 'close':
          MG.closeSettings();
          break;
        case 'reset':
          if (confirm(MG.t('settings.resetConfirm'))) {
            const settings = await MG.call('settings:reset');
            MG.state.settings = settings;
            MG.applyTheme();
            MG.applyLanguage();
            MG.renderToolbar();
            this.render();
            MG.toast(MG.t('settings.saved'), 'success');
          }
          break;
        case 'clear-history':
          if (confirm(MG.t('settings.clearHistoryHint'))) {
            await MG.call('history:clear');
            this.historyItems = [];
            this.render();
            MG.toast(MG.t('toast.historyCleared'), 'success');
          }
          break;
        case 'choose-folder': {
          const path = await MG.call('settings:chooseDownloadFolder');
          if (path) { MG.state.settings.downloadPath = path; this.render(); }
          break;
        }
        case 'clear-downloads':
          await MG.call('downloads:clear');
          MG.state.downloads = [];
          this.render();
          break;
        case 'open-vault':
          MG.closeSettings();
          MG.openSidebar('passwords');
          break;
        case 'add-extension': {
          const result = await MG.call('extensions:add');
          if (result && result.ok) {
            this.extensionItems = result.extensions || await MG.call('extensions:list');
            this.render();
            MG.toast(MG.t('settings.extensionsAdded') + ' — ' + MG.t('settings.extensionsRestart'), 'success', 3200);
          } else if (result && !result.canceled) {
            MG.toast(result.error || MG.t('settings.extensionsError'), 'error', 4200);
          }
          break;
        }
        case 'reload-tabs':
          await MG.call('extensions:reloadTabs');
          MG.toast(MG.t('settings.extensionsReloadTabs'), 'success', 1600);
          break;
        case 'add-action': {
          const label = ($('actionLabel') || {}).value || '';
          const urlTemplate = ($('actionUrl') || {}).value || '';
          if (!label || !urlTemplate) { MG.toast('Label and URL are required', 'error'); return; }
          const list = [...(MG.state.settings.customContextActions || []), { label, urlTemplate }];
          await this.setSetting('customContextActions', list);
          MG.toast(MG.t('settings.saved'), 'success', 1500);
          break;
        }
        case 'add-engine': {
          const name = ($('engineName') || {}).value || '';
          let url = ($('engineUrl') || {}).value || '';
          if (!name || !url) { MG.toast('Name and URL are required', 'error'); return; }
          if (!/\{q\}|%s/.test(url)) url += (url.includes('?') ? '&' : '?') + 'q={q}';
          const list = [...(MG.state.settings.customSearchEngines || []), {
            id: 'custom-' + Date.now(),
            name,
            url,
            color: '#7c5cff'
          }];
          await this.setSetting('customSearchEngines', list);
          await this.refreshEngines();
          break;
        }
        case 'reset-context': {
          const defaults = {};
          for (const key of Object.keys(CONTEXT_LABELS)) defaults[key] = true;
          await MG.call('settings:set', { contextMenu: defaults });
          MG.state.settings.contextMenu = defaults;
          this.render();
          break;
        }
        case 'gen-generate': {
          const value = await MG.call('passwords:generate', { length: 24 });
          if (typeof value === 'string') {
            this.generatorValue = value;
            const out = $('settingsGenValue');
            if (out) out.textContent = value;
          }
          break;
        }
        case 'gen-copy':
          if (this.generatorValue) {
            const ok = await MG.copyText(this.generatorValue);
            if (ok) MG.toast(MG.t('toast.copied'), 'success', 1400);
          }
          break;
        case 'shortcuts-link':
          this.section = 'shortcuts';
          this.render();
          break;
        default:
          break;
      }
    },

    async onChange(event) {
      const ctx = event.target.closest('[data-context-toggle]');
      if (ctx) {
        await this.setNested(ctx.dataset.contextToggle, ctx.checked);
        return;
      }
      if (event.target.id === 'historySearch') {
        const query = event.target.value;
        const items = await MG.call('history:list', { query });
        this.historyItems = Array.isArray(items) ? items : [];
        const list = $('historyList');
        if (!list) return;
        list.innerHTML = this.historyItems.length ? this.historyItems.map((item) => `
          <div class="history-item">
            <span class="tab-favicon">${MG.faviconHtml({ url: item.url, favicon: item.favicon })}</span>
            <span class="history-main"><span class="history-title">${MG.esc(item.title || item.url)}</span>
              <span class="history-url">${MG.esc(MG.prettyUrl(item.url))}</span></span>
            <span class="history-time">${MG.esc(MG.timeAgo(item.visitedAt))}</span>
            <button class="tool-btn small" data-history-remove="${MG.esc(item.url)}">${MG.icon('trash')}</button>
          </div>`).join('') : `<div class="settings-empty">${MG.esc(MG.t('settings.historyEmpty'))}</div>`;
      }
    },

    async refreshEngines() {
      const engines = await MG.call('omni:engines');
      if (Array.isArray(engines)) MG.state.engines = engines;
      MG.renderToolbar();
    }
  };

  MG.settingsUI = settingsUI;
})();
