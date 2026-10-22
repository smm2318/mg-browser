'use strict';

(function () {
  const MG = window.MG;
  const $ = (id) => document.getElementById(id);

  const omni = {
    panel: null,
    input: null,
    open: false,
    enginePicker: false,
    tabSwitcher: false,
    lastQuery: '',
    seq: 0,
    data: null,
    selected: -1,
    queryTimer: null,
    blurTimer: null,

    init() {
      this.panel = $('omniPanel');
      this.input = $('omnibox');
      const form = $('omniboxForm');
      const wrap = form;

      this.input.addEventListener('focus', () => {
        wrap.classList.add('focused');
        MG.state.editingOmnibox = true;
        $('omnibox').select();
        this.openPanel();
        this.handleInput(this.input.value, true);
      });

      this.input.addEventListener('blur', () => {
        wrap.classList.remove('focused');
        MG.state.editingOmnibox = false;
        this.blurTimer = setTimeout(() => {
          if (!this.panel.matches(':hover')) this.close();
        }, 150);
      });

      this.input.addEventListener('input', () => {
        this.handleInput(this.input.value);
      });

      this.input.addEventListener('keydown', (event) => this.onKeyDown(event));

      this.input.addEventListener('mousedown', () => {
        if (document.activeElement !== this.input) return;
        if (!this.open) this.openPanel();
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = this.input.value.trim();
        if (!text) return;
        this.navigate(text, null, 'current');
      });

      $('engineBtn').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggleEnginePicker();
      });

      this.panel.addEventListener('mousedown', (event) => {
        // keep input focus when clicking inside the panel
        event.preventDefault();
      });

      this.panel.addEventListener('click', (event) => this.onPanelClick(event));
      this.panel.addEventListener('mousemove', (event) => {
        const row = event.target.closest('[data-action]');
        if (!row) return;
        const all = [...this.panel.querySelectorAll('[data-action]')];
        const idx = all.indexOf(row);
        if (idx >= 0 && idx !== this.selected) this.select(idx);
      });

      document.addEventListener('mousedown', (event) => {
        if (!this.open) return;
        if (event.target.closest('.omnibox') || event.target.closest('#omniPanel')) return;
        this.close();
      });

      window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.focus();
        }
      });

      window.addEventListener('resize', () => {
        if (this.open) this.alignPanel();
      });

      this.updatePlaceholder();
    },

    updatePlaceholder() {
      const engine = this.engine();
      if (this.input) this.input.setAttribute('placeholder', MG.t('omni.placeholder', { engine: engine ? engine.name : 'the web' }));
    },

    refresh() {
      this.updatePlaceholder();
      if (this.open) this.render();
    },

    engine() {
      const engines = MG.state.engines || [];
      return engines.find((e) => e.id === MG.state.settings.searchEngine) || engines[0];
    },

    focus() {
      if (MG.state.settingsOpen) MG.closeSettings();
      this.input.focus();
      this.input.select();
      this.openPanel();
      this.handleInput(this.input.value, true);
    },

    isOpen() {
      return this.open;
    },

    openPanel() {
      this.open = true;
      this.panel.classList.remove('hidden');
      this.alignPanel();
      MG.updateLayout();
    },

    alignPanel() {
      if (!this.panel || !this.input) return;
      const box = this.input.closest('.omnibox');
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const available = Math.max(240, window.innerWidth - rect.left - 12);
      const width = Math.max(240, Math.min(rect.width, available));
      this.panel.style.width = width + 'px';
      this.panel.style.marginLeft = Math.max(0, Math.round(rect.left)) + 'px';
      this.panel.style.marginRight = '0px';
      this.panel.style.marginTop = '0px';
    },

    close() {
      this.open = false;
      this.enginePicker = false;
      this.tabSwitcher = false;
      this.panel.classList.add('hidden');
      this.panel.innerHTML = '';
      this.selected = -1;
      MG.updateLayout();
    },

    syncFromTab() {
      this.updatePlaceholder();
    },

    onPanelClick(event) {
      if (event.target.closest('[data-engine-search]')) return;
      const row = event.target.closest('[data-action]');
      if (!row) return;
      const all = this.getActionables();
      const idx = all.indexOf(row);
      if (idx >= 0) this.selected = idx;
      this.activateRow(row, event.altKey ? 'newtab' : event.ctrlKey ? 'split' : 'current');
    },

    handleInput(text, immediate) {
      clearTimeout(this.queryTimer);
      this.lastQuery = text;
      const value = String(text || '').trim();
      if (!value) {
        this.enginePicker = false;
        this.tabSwitcher = false;
        this.renderEmpty();
        return;
      }
      if (this.enginePicker || this.tabSwitcher) {
        this.enginePicker = false;
        this.tabSwitcher = false;
      }
      this.renderLoading();
      const run = async () => {
        const seq = ++this.seq;
        try {
          const data = await MG.call('omni:query', { text: value });
          if (seq !== this.seq || !this.open) return;
          if (data && data.error) {
            this.renderEmpty();
            return;
          }
          this.data = data;
          this.render();
        } catch {
          this.renderEmpty();
        }
      };
      if (immediate) run();
      else this.queryTimer = setTimeout(run, 90);
    },

    renderLoading() {
      this.panel.innerHTML = `<div class="omni-empty"><span class="tab-spinner" style="position:relative;display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-inline-end:8px;"></span>${MG.esc(MG.t('common.loading'))}</div>`;
      this.openPanel();
    },

    renderEmpty() {
      const recent = (MG.state.history || []).slice(0, 6);
      const tabs = MG.state.tabs || [];
      let html = '';
      if (tabs.length) {
        html += `<div class="omni-section-title">${MG.esc(MG.t('omni.openTabs'))}<span class="hint">${MG.esc(MG.t('tabs.count'))} ${tabs.length}</span></div>`;
        for (const tab of tabs.slice(0, 6)) {
          html += this.tabRow(tab);
        }
      }
      if (recent.length) {
        html += `<div class="omni-section-title">${MG.esc(MG.t('omni.recent'))}</div>`;
        for (const item of recent) html += this.historyRow(item);
      }
      if (!html) {
        html = `<div class="omni-empty">${MG.esc(MG.t('welcome.noRecent'))}</div>`;
      }
      this.panel.innerHTML = html + this.engineStrip('');
      this.openPanel();
      this.selected = -1;
    },

    getActionables() {
      return [...this.panel.querySelectorAll('[data-action]')];
    },

    select(index) {
      const rows = this.getActionables();
      if (!rows.length) return;
      this.selected = Math.max(0, Math.min(index, rows.length - 1));
      rows.forEach((row, idx) => row.classList.toggle('selected', idx === this.selected));
      const row = rows[this.selected];
      if (row) row.scrollIntoView({ block: 'nearest' });
    },

    onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (this.open) {
          this.close();
        } else {
          this.input.blur();
          const tab = MG.activeTab();
          if (tab) this.input.value = tab.isNewTab ? '' : MG.displayUrl(tab.url);
        }
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.select(this.selected + 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.select(this.selected - 1);
        return;
      }
      if (event.key === 'Tab' && this.open) {
        const rows = this.getActionables();
        if (rows.length) {
          event.preventDefault();
          this.select(this.selected + (event.shiftKey ? -1 : 1));
        }
        return;
      }
      if (event.key === 'Enter') {
        const rows = this.getActionables();
        if (this.open && rows.length && this.selected >= 0) {
          event.preventDefault();
          const row = rows[this.selected];
          this.activateRow(row, event.altKey ? 'newtab' : event.ctrlKey ? 'split' : 'current');
          return;
        }
        event.preventDefault();
        const text = this.input.value.trim();
        if (!text) return;
        this.navigate(text, null, event.altKey ? 'newtab' : event.ctrlKey ? 'split' : 'current');
        return;
      }
      if (event.key === 'Enter' && event.altKey) {
        event.preventDefault();
      }
    },

    activateRow(row, disposition) {
      if (!row) return;
      const action = row.dataset.action;
      const text = row.dataset.text || '';
      const url = row.dataset.url || '';
      if (action === 'search') {
        this.navigate(text || url, row.dataset.engine || null, disposition);
      } else if (action === 'url') {
        this.navigate(url, null, disposition);
      } else if (action === 'tab') {
        MG.call('tabs:activate', { id: Number(row.dataset.tabId) });
        this.close();
      } else if (action === 'engine') {
        this.setEngine(row.dataset.engine);
      } else if (action === 'card') {
        if (row.dataset.url) this.navigate(row.dataset.url, null, disposition);
        else this.navigate(text || this.lastQuery, null, disposition);
      } else if (action === 'settings') {
        MG.openSettings('search');
        this.close();
      } else if (action === 'tab-switcher') {
        MG.call('tabs:activate', { id: Number(row.dataset.tabId) });
        this.close();
      }
    },

    navigate(text, engineId, disposition) {
      const value = String(text || '').trim();
      if (!value) return;
      MG.call('omni:open', { text: value, engineId: engineId || null, disposition: disposition || 'current' });
      this.close();
      this.input.blur();
    },

    setEngine(engineId) {
      MG.call('omni:setEngine', { engineId }).then(() => {
        MG.state.settings.searchEngine = engineId;
        this.enginePicker = false;
        MG.renderToolbar();
        this.handleInput(this.input.value, true);
        this.input.focus();
      });
    },

    toggleEnginePicker() {
      this.enginePicker = !this.enginePicker;
      if (this.enginePicker) {
        this.openPanel();
        this.renderEnginePicker();
        this.input.focus();
      } else {
        this.close();
      }
    },

    renderEnginePicker() {
      const engines = MG.state.engines || [];
      const current = MG.state.settings.searchEngine;
      let html = `<div class="omni-section-title">${MG.esc(MG.t('omni.engines'))}<span class="spacer"></span><span class="hint">${engines.length}</span></div><div class="engine-grid">`;
      for (const engine of engines) {
        html += `<div class="engine-tile ${engine.id === current ? 'active' : ''}" data-action="engine" data-engine="${MG.esc(engine.id)}">` +
          `<span class="engine-glyph" style="--engine-color:${MG.esc(engine.color || '#7c5cff')}">${MG.esc(engine.glyph || engine.name.charAt(0))}</span>` +
          `<span class="engine-tile-name">${MG.esc(engine.name)}</span>` +
          (engine.id === current ? `<svg class="icon check"><use href="#i-check"></use></svg>` : '') +
          `</div>`;
      }
      html += '</div>';
      html += `<div class="omni-footer"><span>${MG.esc(MG.t('omni.setDefault'))}</span><span class="spacer" style="flex:1"></span><button class="btn ghost" data-action="settings" style="height:24px;font-size:11px">${MG.esc(MG.t('settings.customEngine'))}</button></div>`;
      this.panel.innerHTML = html;
      this.selected = -1;
      this.openPanel();
    },

    showTabSwitcher() {
      this.tabSwitcher = true;
      this.openPanel();
      this.input.focus();
      const tabs = MG.state.tabs || [];
      let html = `<div class="omni-section-title">${MG.esc(MG.t('omni.openTabs'))}<span class="spacer"></span><span class="hint">${tabs.length}</span></div>`;
      if (!tabs.length) html += `<div class="omni-empty">${MG.esc(MG.t('tabs.empty'))}</div>`;
      for (const tab of tabs) {
        html += this.tabRow(tab, 'tab-switcher');
      }
      this.panel.innerHTML = html;
      this.selected = -1;
    },

    render() {
      if (this.tabSwitcher) {
        this.showTabSwitcher();
        return;
      }
      if (!this.data) {
        this.renderEmpty();
        return;
      }
      const data = this.data;
      const query = (data.query || '').trim();
      const engine = this.engine();
      let html = '';
      let cardCount = 0;
      for (const card of data.cards || []) {
        if (cardCount >= 2) break;
        html += this.cardHtml(card);
        cardCount += 1;
      }

      const suggestions = data.suggestions || [];
      if (suggestions.length) {
        html += `<div class="omni-section-title">${MG.esc(MG.t('omni.suggestions'))}<span class="spacer"></span><span class="hint">${MG.esc(engine ? engine.name : '')}</span></div>`;
        for (const suggestion of suggestions.slice(0, 8)) {
          html += this.suggestionRow(suggestion, query);
        }
      }

      if (data.tabs && data.tabs.length) {
        html += `<div class="omni-section-title">${MG.esc(MG.t('omni.openTabs'))}</div>`;
        for (const tab of data.tabs.slice(0, 4)) html += this.tabRow(tab);
      }

      if (data.history && data.history.length) {
        html += `<div class="omni-section-title">${MG.esc(MG.t('omni.recent'))}</div>`;
        for (const item of data.history.slice(0, 3)) html += this.historyRow(item);
      }

      if (!data.cards?.length && !suggestions.length && !(data.tabs || []).length && !(data.history || []).length) {
        html += `<div class="omni-empty">${MG.esc(MG.t('omni.noResults'))}</div>`;
      }

      html += this.engineStrip(query, engine);
      this.panel.innerHTML = html;
      this.selected = -1;
      this.openPanel();
    },

    cardHtml(card) {
      if (card.kind === 'calc') {
        return `<div class="omni-answer" data-action="card" data-url="" data-text="${MG.esc(card.title)}">
          <div class="omni-answer-thumb"><svg class="icon" style="width:26px;height:26px"><use href="#i-sparkles"></use></svg></div>
          <div class="omni-answer-body">
            <div class="omni-answer-kicker">${MG.esc(MG.t('omni.calculator'))}</div>
            <div class="omni-calc">${MG.esc(card.text)}</div>
            <div class="omni-calc-sub">${MG.esc(card.title)}</div>
          </div>
        </div>`;
      }
      const thumb = card.thumbnail
        ? `<div class="omni-answer-thumb"><img src="${MG.esc(card.thumbnail)}" alt=""></div>`
        : `<div class="omni-answer-thumb"><svg class="icon" style="width:24px;height:24px"><use href="#i-${card.kind === 'wiki' ? 'bookmark' : card.kind === 'navigation' ? 'arrow-up-right' : 'sparkles'}"></use></svg></div>`;
      const kicker = card.kind === 'navigation'
        ? MG.t('omni.openUrl', { url: '' }).replace('{url}', '').trim() || 'Open'
        : card.kind === 'search'
          ? MG.t('omni.searchFor', { q: card.title })
          : `${MG.t('omni.answer')} · ${card.source || ''}`;
      const link = card.url
        ? `<a href="#" data-action="card" data-url="${MG.esc(card.url)}">${MG.esc(MG.t('omni.readMore'))} ↗</a>`
        : '';
      return `<div class="omni-answer" data-action="card" data-url="${MG.esc(card.url || '')}" data-text="${MG.esc(card.title || '')}">
        ${thumb}
        <div class="omni-answer-body">
          <div class="omni-answer-kicker">${MG.esc(kicker)}</div>
          <div class="omni-answer-title">${MG.esc(card.title || '')}</div>
          <div class="omni-answer-text">${MG.esc(card.text || '')}</div>
          <div class="omni-answer-foot"><span>${MG.esc(card.source || '')}</span>${link}</div>
        </div>
      </div>`;
    },

    suggestionRow(suggestion, query) {
      const text = suggestion.text || '';
      const source = suggestion.source || '';
      const isHistory = suggestion.source === 'History';
      return `<div class="omni-row" data-action="search" data-text="${MG.esc(text)}" data-engine="${MG.esc(MG.state.settings.searchEngine)}">
        <span class="omni-row-icon">${MG.icon(isHistory ? 'history' : 'search')}</span>
        <span class="omni-row-main"><span class="omni-row-primary">${MG.esc(text)}</span></span>
        <span class="omni-row-hint">${MG.esc(source)}</span>
      </div>`;
    },

    historyRow(item) {
      return `<div class="omni-row" data-action="url" data-url="${MG.esc(item.url)}">
        <span class="omni-row-icon">${MG.icon('history')}</span>
        <span class="omni-row-main">
          <span class="omni-row-primary">${MG.esc(item.title || item.url)}</span>
          <span class="omni-row-secondary">${MG.esc(MG.prettyUrl(item.url))}</span>
        </span>
        <span class="omni-row-hint">${MG.esc(MG.timeAgo(item.visitedAt || 0))}</span>
      </div>`;
    },

    tabRow(tab, action) {
      return `<div class="omni-row" data-action="${action || 'tab'}" data-tab-id="${tab.id}">
        <span class="omni-row-icon accent">${MG.faviconHtml(tab)}</span>
        <span class="omni-row-main">
          <span class="omni-row-primary">${MG.esc(tab.isNewTab ? MG.t('common.newTab') : tab.title || MG.prettyUrl(tab.url))}</span>
          <span class="omni-row-secondary">${MG.esc(MG.prettyUrl(tab.url))}</span>
        </span>
        <span class="omni-row-hint">${MG.esc(MG.t('omni.tabHint'))}<span class="omni-kbd">↵</span></span>
      </div>`;
    },

    engineStrip(query, activeEngine) {
      const engines = MG.state.engines || [];
      let buttons = '';
      for (const engine of engines) {
        buttons += `<button class="engine-strip-btn" data-engine-search="${MG.esc(engine.id)}" title="${MG.esc(MG.t('common.searchWith') + ' ' + engine.name)}" style="--engine-color:${MG.esc(engine.color || '#7c5cff')}">
          <span class="engine-glyph" style="width:19px;height:19px;font-size:10px">${MG.esc(engine.glyph || engine.name.charAt(0))}</span>
        </button>`;
      }
      return `<div class="omni-footer">
        <span class="engine-strip">${buttons}</span>
        <span class="spacer" style="flex:1"></span>
        <span class="omni-kbd">↵</span><span>${MG.esc(MG.t('common.open'))}</span>
        <span class="omni-kbd">Alt+↵</span><span>${MG.esc(MG.t('common.openInNewTab'))}</span>
      </div>`;
    }
  };

  // Event delegation for engine strip (buttons are re-rendered often)
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-engine-search]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const query = omni.lastQuery.trim();
    if (!query) return;
    omni.navigate(query, btn.dataset.engineSearch, event.altKey ? 'newtab' : 'current');
  });

  MG.omni = omni;
})();
