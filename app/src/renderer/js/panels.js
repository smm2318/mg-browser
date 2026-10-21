'use strict';

(function () {
  const MG = window.MG;
  const $ = (id) => document.getElementById(id);
  const panels = {
    passwords: [],
    loaded: false,
    revealed: new Set(),
    search: '',
    generator: { length: 20, symbols: true, digits: true, uppercase: true, value: '' },
    addOpen: false,
    promptId: null,

    init() {},

    renderSidebar() {
      const sidebar = $('sidebar');
      if (!sidebar || !MG.state.sidebar) return;
      sidebar.classList.remove('hidden');
      if (MG.state.sidebar === 'downloads') this.renderDownloads();
      else this.renderPasswords();
    },

    /* ------------------------------------------------------------ */
    /* downloads                                                     */
    /* ------------------------------------------------------------ */

    renderDownloads() {
      const sidebar = $('sidebar');
      const items = MG.state.downloads || [];
      const activeCount = items.filter((d) => d.state === 'progressing' || d.state === 'paused').length;
      const countText = activeCount
        ? MG.t('downloads.active', { count: activeCount })
        : items.length === 1
          ? MG.t('downloads.itemOne')
          : MG.t('downloads.count', { count: items.length });
      sidebar.innerHTML =
        `<div class="sidebar-head">
          <div style="flex:1;min-width:0">
            <div class="sidebar-title">${MG.esc(MG.t('downloads.title'))}</div>
            <div class="sidebar-sub">${MG.esc(countText)}</div>
          </div>
          <button class="tool-btn small" data-sidebar-action="choose-folder" title="${MG.esc(MG.t('downloads.chooseFolder'))}">${MG.icon('folder')}</button>
          <button class="tool-btn small" data-sidebar-action="clear" title="${MG.esc(MG.t('downloads.clear'))}">${MG.icon('trash')}</button>
          <button class="tool-btn small" data-sidebar-action="close" title="${MG.esc(MG.t('common.close'))}">${MG.icon('close')}</button>
        </div>
        <div class="sidebar-body">${items.length ? items.map((item) => this.downloadItem(item)).join('') : this.emptyState('download', MG.t('downloads.empty'), MG.t('downloads.emptyHint'))}</div>
        <div class="sidebar-foot" style="padding:8px 14px;border-top:1px solid var(--border);font-size:10.5px;color:var(--text-3);display:flex;justify-content:space-between;gap:8px;align-items:center">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">${MG.esc(MG.state.settings.downloadPath || 'Downloads')}</span>
          <button class="btn ghost" style="height:22px;font-size:10.5px;padding:0 6px;flex:none;white-space:nowrap" data-sidebar-action="choose-folder">${MG.esc(MG.t('downloads.chooseFolder'))}</button>
        </div>`;
    },

    downloadItem(item) {
      const pct = item.totalBytes ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100)) : 0;
      const ext = (item.filename.split('.').pop() || 'file').slice(0, 4);
      const stateLabel = {
        progressing: MG.t('downloads.progressing'),
        paused: MG.t('downloads.paused'),
        completed: MG.t('downloads.completed'),
        cancelled: MG.t('downloads.cancelled'),
        interrupted: MG.t('downloads.interrupted')
      }[item.state] || item.state;
      const size = item.totalBytes
        ? `${MG.formatBytes(item.receivedBytes)} / ${MG.formatBytes(item.totalBytes)}`
        : MG.formatBytes(item.receivedBytes);
      const active = item.state === 'progressing' || item.state === 'paused';
      return `<div class="dl-item">
        <div class="dl-icon">${MG.esc(ext)}</div>
        <div class="dl-main">
          <div class="dl-name" title="${MG.esc(item.filename)}">${MG.esc(item.filename)}</div>
          <div class="dl-meta">
            <span>${MG.esc(stateLabel)}</span><span class="dot"></span><span>${MG.esc(size)}</span><span class="dot"></span><span>${MG.esc(MG.timeAgo(item.startedAt))}</span>
          </div>
          ${active ? `<div class="dl-bar"><span style="width:${pct}%"></span></div>` : ''}
        </div>
        <div class="dl-actions">
          ${item.state === 'completed' ? `<button class="tool-btn small" data-dl="open" data-id="${MG.esc(item.id)}" title="${MG.esc(MG.t('downloads.open'))}">${MG.icon('external')}</button>` : ''}
          ${item.state === 'completed' ? `<button class="tool-btn small" data-dl="reveal" data-id="${MG.esc(item.id)}" title="${MG.esc(MG.t('downloads.folder'))}">${MG.icon('folder')}</button>` : ''}
          ${item.state === 'progressing' ? `<button class="tool-btn small" data-dl="pause" data-id="${MG.esc(item.id)}" title="${MG.esc(MG.t('downloads.pause'))}">${MG.icon('pause')}</button>` : ''}
          ${item.state === 'paused' ? `<button class="tool-btn small" data-dl="resume" data-id="${MG.esc(item.id)}" title="${MG.esc(MG.t('downloads.resume'))}">${MG.icon('play')}</button>` : ''}
          ${active ? `<button class="tool-btn small" data-dl="cancel" data-id="${MG.esc(item.id)}" title="${MG.esc(MG.t('downloads.cancel'))}">${MG.icon('close')}</button>` : ''}
          <button class="tool-btn small" data-dl="remove" data-id="${MG.esc(item.id)}" title="${MG.esc(MG.t('downloads.remove'))}">${MG.icon('trash')}</button>
        </div>
      </div>`;
    },

    emptyState(kind, title, hint) {
      const icon = kind === 'download' ? 'download' : 'key';
      return `<div class="empty-state">
        <div class="empty-art">${MG.icon(icon)}</div>
        <div class="empty-title">${MG.esc(title)}</div>
        <div class="empty-hint">${MG.esc(hint)}</div>
      </div>`;
    },

    /* ------------------------------------------------------------ */
    /* passwords                                                     */
    /* ------------------------------------------------------------ */

    async loadPasswords() {
      try {
        const list = await MG.call('passwords:list');
        if (Array.isArray(list)) this.passwords = list;
      } catch { /* ignore */ }
      this.loaded = true;
    },

    renderPasswords() {
      const sidebar = $('sidebar');
      const all = this.passwords || [];
      const query = this.search.toLowerCase();
      const items = all.filter((p) =>
        !query || (p.host || '').toLowerCase().includes(query) || (p.username || '').toLowerCase().includes(query)
      );
      const gen = this.generator;
      const strengthLevel = this.strengthLevel(gen.value);
      sidebar.innerHTML =
        `<div class="sidebar-head">
          <div style="flex:1;min-width:0">
            <div class="sidebar-title">${MG.esc(MG.t('passwords.title'))}</div>
            <div class="sidebar-sub">${MG.esc(MG.t('passwords.encrypted'))}</div>
          </div>
          <button class="tool-btn small" data-pw-action="add" title="${MG.esc(MG.t('passwords.add'))}">${MG.icon('plus')}</button>
          <button class="tool-btn small" data-sidebar-action="close" title="${MG.esc(MG.t('common.close'))}">${MG.icon('close')}</button>
        </div>
        <div class="sidebar-body">
          <div class="sidebar-search">${MG.icon('search')}<input id="pwSearch" type="text" placeholder="${MG.esc(MG.t('passwords.search'))}" value="${MG.esc(this.search)}"></div>
          <div style="padding:0 4px 6px;font-size:10.5px;color:var(--text-3)">${MG.esc(MG.t('passwords.count', { count: all.length }))}</div>
          ${this.addOpen ? this.addForm() : ''}
          <div id="pwList">${items.length ? items.map((p) => this.passwordItem(p)).join('') : this.emptyState('password', MG.t('passwords.empty'), MG.t('passwords.emptyHint'))}</div>
          <div class="generator">
            <div class="generator-title">${MG.icon('sparkles')}<span>${MG.esc(MG.t('passwords.generator'))}</span></div>
            <div class="gen-output"><span id="genValue">${MG.esc(gen.value || '—')}</span>
              <button class="tool-btn small" data-gen="copy" title="${MG.esc(MG.t('common.copy'))}">${MG.icon('copy')}</button>
              <button class="tool-btn small" data-gen="generate" title="${MG.esc(MG.t('passwords.generate'))}">${MG.icon('reload')}</button>
            </div>
            <div class="strength" data-level="${strengthLevel}"><i></i><i></i><i></i><i></i></div>
            <div class="gen-row"><span>${MG.esc(MG.t('passwords.length'))}</span><input id="genLength" type="range" min="8" max="48" value="${gen.length}"><span class="gen-value" id="genLengthValue">${gen.length}</span></div>
            <div class="gen-row"><label><input id="genSymbols" type="checkbox" ${gen.symbols ? 'checked' : ''}> ${MG.esc(MG.t('passwords.symbols'))}</label>
              <label><input id="genDigits" type="checkbox" ${gen.digits ? 'checked' : ''}> ${MG.esc(MG.t('passwords.digits'))}</label>
              <label><input id="genUpper" type="checkbox" ${gen.uppercase ? 'checked' : ''}> ${MG.esc(MG.t('passwords.uppercase'))}</label>
            </div>
            <button class="btn primary" style="width:100%;margin-top:9px" data-gen="generate">${MG.icon('sparkles')}${MG.esc(MG.t('passwords.generate'))}</button>
          </div>
        </div>`;
      this.bindPasswordEvents();
      if (!this.generator.value) setTimeout(() => this.generate(), 60);
    },

    passwordItem(entry) {
      const revealed = this.revealed.has(entry.id);
      const color = MG.colorFor(entry.host || entry.origin);
      const initials = (entry.host || 'site').replace(/^www\./, '').slice(0, 2).toUpperCase();
      return `<div class="pw-item" data-id="${MG.esc(entry.id)}">
        <div class="pw-avatar" style="--fav-color:${color}">${MG.esc(initials)}</div>
        <div class="pw-main">
          <div class="pw-site">${MG.esc(entry.host || entry.origin)}</div>
          <div class="pw-user">${MG.esc(entry.username || '—')}</div>
          <div class="pw-value ${revealed ? '' : 'hidden'}" data-value-for="${MG.esc(entry.id)}">${revealed ? MG.esc(this.revealedText(entry.id)) : '••••••••••••'}</div>
        </div>
        <div class="pw-actions">
          <button class="tool-btn small" data-pw="reveal" data-id="${MG.esc(entry.id)}" title="${MG.esc(revealed ? MG.t('passwords.hide') : MG.t('passwords.reveal'))}">${MG.icon(revealed ? 'eye-off' : 'eye')}</button>
          <button class="tool-btn small" data-pw="copy-password" data-id="${MG.esc(entry.id)}" title="${MG.esc(MG.t('passwords.copyPassword'))}">${MG.icon('copy')}</button>
          <button class="tool-btn small" data-pw="delete" data-id="${MG.esc(entry.id)}" title="${MG.esc(MG.t('common.delete'))}">${MG.icon('trash')}</button>
        </div>
      </div>`;
    },

    addForm() {
      return `<div class="generator" style="margin:0 4px 10px">
        <div class="generator-title">${MG.icon('key')}<span>${MG.esc(MG.t('passwords.addTitle'))}</span></div>
        <input class="input" id="addSite" placeholder="${MG.esc(MG.t('passwords.site'))}" style="width:100%;margin-bottom:6px">
        <input class="input" id="addUser" placeholder="${MG.esc(MG.t('passwords.username'))}" style="width:100%;margin-bottom:6px">
        <input class="input" id="addPassword" placeholder="${MG.esc(MG.t('passwords.password'))}" style="width:100%;margin-bottom:8px">
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn ghost" data-pw-action="add-cancel">${MG.esc(MG.t('common.cancel'))}</button>
          <button class="btn primary" data-pw-action="add-save">${MG.esc(MG.t('common.save'))}</button>
        </div>
      </div>`;
    },

    revealedText(id) {
      const entry = this.passwords.find((p) => p.id === id);
      return entry && entry._plain ? entry._plain : '••••••••••••';
    },

    strengthLevel(value) {
      if (!value) return 1;
      let score = 0;
      if (value.length >= 8) score += 1;
      if (value.length >= 14) score += 1;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
      if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
      return Math.max(1, Math.min(4, score));
    },

    bindPasswordEvents() {
      const sidebar = $('sidebar');
      const searchInput = $('pwSearch');
      if (searchInput) {
        searchInput.addEventListener('input', (event) => {
          this.search = event.target.value;
          const list = $('pwList');
          const query = this.search.toLowerCase();
          const items = this.passwords.filter((p) =>
            !query || (p.host || '').toLowerCase().includes(query) || (p.username || '').toLowerCase().includes(query)
          );
          list.innerHTML = items.length
            ? items.map((p) => this.passwordItem(p)).join('')
            : this.emptyState('password', MG.t('passwords.empty'), MG.t('passwords.emptyHint'));
        });
      }
      const length = $('genLength');
      if (length) {
        length.addEventListener('input', (event) => {
          this.generator.length = Number(event.target.value);
          $('genLengthValue').textContent = this.generator.length;
        });
        $('genSymbols').addEventListener('change', (event) => { this.generator.symbols = event.target.checked; });
        $('genDigits').addEventListener('change', (event) => { this.generator.digits = event.target.checked; });
        $('genUpper').addEventListener('change', (event) => { this.generator.uppercase = event.target.checked; });
      }
    },

    async generate() {
      const value = await MG.call('passwords:generate', this.generator);
      if (typeof value !== 'string') return;
      this.generator.value = value;
      const out = $('genValue');
      if (out) out.textContent = value;
      const bars = $('sidebar').querySelector('.strength');
      if (bars) bars.dataset.level = String(this.strengthLevel(value));
    },

    /* ------------------------------------------------------------ */
    /* prompt                                                        */
    /* ------------------------------------------------------------ */

    showPasswordPrompt(payload) {
      this.promptId = payload.requestId;
      const host = (() => { try { return new URL(payload.origin).host; } catch { return payload.origin; } })();
      const bar = $('savebar');
      bar.innerHTML =
        `<span class="savebar-icon">${MG.icon('key')}</span>` +
        `<div class="savebar-text">
          <div class="savebar-title">${MG.esc(MG.t('passwords.savePrompt', { site: host }))}</div>
          <div class="savebar-sub">${MG.esc(payload.username || '')} · ${MG.esc(MG.t('passwords.savePromptHint'))}</div>
        </div>
        <div class="savebar-actions">
          <button class="btn ghost" data-pwprompt="never">${MG.esc(MG.t('passwords.never'))}</button>
          <button class="btn ghost" data-pwprompt="dismiss">${MG.esc(MG.t('passwords.notNow'))}</button>
          <button class="btn primary" data-pwprompt="save">${MG.esc(MG.t('passwords.save'))}</button>
        </div>`;
      bar.classList.remove('hidden');
      bar.querySelectorAll('[data-pwprompt]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.pwprompt;
          MG.call('passwords:promptResponse', { requestId: payload.requestId, action });
          bar.classList.add('hidden');
          bar.innerHTML = '';
          this.promptId = null;
          MG.updateLayout();
          if (action === 'save') {
            this.loaded = false;
            this.loadPasswords().then(() => {
              if (MG.state.sidebar === 'passwords') this.renderPasswords();
            });
          }
        });
      });
      MG.updateLayout();
    }
  };

  /* -------------------------------------------------------------- */
  /* delegated sidebar events                                       */
  /* -------------------------------------------------------------- */

  document.addEventListener('click', async (event) => {
    if (!MG.state.sidebar) return;

    const closeBtn = event.target.closest('[data-sidebar-action="close"]');
    if (closeBtn) { MG.closeSidebar(); return; }

    const clearBtn = event.target.closest('[data-sidebar-action="clear"]');
    if (clearBtn) {
      if (confirm(MG.t('downloads.clear') + '?')) await MG.call('downloads:clear');
      return;
    }

    const folderBtn = event.target.closest('[data-sidebar-action="choose-folder"]');
    if (folderBtn) {
      const path = await MG.call('settings:chooseDownloadFolder');
      if (path) MG.toast(path, 'success');
      return;
    }

    const dlBtn = event.target.closest('[data-dl]');
    if (dlBtn) {
      const id = dlBtn.dataset.id;
      const action = dlBtn.dataset.dl;
      await MG.call('downloads:' + action, { id });
      if (action === 'remove' || action === 'cancel') {
        MG.state.downloads = await MG.call('downloads:list');
      }
      return;
    }

    const pwBtn = event.target.closest('[data-pw]');
    if (pwBtn) {
      const entry = panels.passwords.find((p) => p.id === pwBtn.dataset.id);
      const id = pwBtn.dataset.id;
      if (pwBtn.dataset.pw === 'reveal') {
        if (panels.revealed.has(id)) {
          panels.revealed.delete(id);
          if (entry) delete entry._plain;
        } else {
          const value = await MG.call('passwords:reveal', { id });
          if (entry) entry._plain = value || '';
          panels.revealed.add(id);
        }
        panels.renderPasswords();
      } else if (pwBtn.dataset.pw === 'copy-password') {
        await MG.call('passwords:copy', { id, field: 'password' });
        MG.toast(MG.t('toast.copied'), 'success', 1400);
      } else if (pwBtn.dataset.pw === 'delete') {
        if (confirm(MG.t('passwords.deleteConfirm'))) {
          await MG.call('passwords:delete', { id });
          panels.passwords = await MG.call('passwords:list');
          panels.renderPasswords();
        }
      }
      return;
    }

    const addBtn = event.target.closest('[data-pw-action]');
    if (addBtn) {
      const action = addBtn.dataset.pwAction;
      if (action === 'add') { panels.addOpen = true; panels.renderPasswords(); }
      else if (action === 'add-cancel') { panels.addOpen = false; panels.renderPasswords(); }
      else if (action === 'add-save') {
        const site = ($('addSite') || {}).value || '';
        const username = ($('addUser') || {}).value || '';
        const password = ($('addPassword') || {}).value || '';
        if (!site || !password) { MG.toast('Website and password are required', 'error'); return; }
        let origin = site;
        try {
          origin = new URL(/^[a-z]+:\/\//i.test(site) ? site : 'https://' + site).origin;
        } catch { origin = site; }
        await MG.call('passwords:save', { origin, username, password });
        panels.addOpen = false;
        panels.passwords = await MG.call('passwords:list');
        panels.renderPasswords();
        MG.toast(MG.t('passwords.saved'), 'success');
      }
      return;
    }

    const genBtn = event.target.closest('[data-gen]');
    if (genBtn) {
      if (genBtn.dataset.gen === 'generate') panels.generate();
      else if (genBtn.dataset.gen === 'copy' && panels.generator.value) {
        MG.copyText(panels.generator.value).then((ok) => { if (ok) MG.toast(MG.t('toast.copied'), 'success', 1400); });
      }
    }
  });

  // auto-load passwords when opening the sidebar
  const originalRender = panels.renderSidebar.bind(panels);
  panels.renderSidebar = function () {
    if (MG.state.sidebar === 'passwords' && !this.loaded) {
      this.loadPasswords().then(() => {
        this.loaded = true;
        if (MG.state.sidebar === 'passwords') originalRender();
      });
      this.loaded = true;
    }
    originalRender();
  };

  MG.panels = panels;
})();
