'use strict';

(function () {
  const MG = window.MG;
  const $ = (id) => document.getElementById(id);

  const dt = {
    open: false,
    activeTab: 'console',
    consoleItems: [],
    networkItems: [],
    attached: false,
    elementsLoaded: false,
    appLoaded: false,
    filter: '',

    init() {
      const panel = $('devtoolsPanel');
      panel.addEventListener('click', (event) => this.onClick(event));
      panel.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.id === 'dtPrompt') {
          this.evaluate(event.target.value);
          event.target.value = '';
        }
      });
    },

    open() {
      this.open = true;
      this.renderShell();
      MG.call('devtools:toggle', { open: true });
      MG.call('devtools:snapshot').then((snapshot) => {
        if (!snapshot || snapshot.error) return;
        this.consoleItems = snapshot.console || [];
        this.networkItems = snapshot.network || [];
        this.attached = !!snapshot.attached;
        this.renderConsole();
        this.renderNetwork();
        this.updateStatus();
      });
    },

    close() {
      this.open = false;
    },

    render() {
      if (!this.open) return;
      const panel = $('devtoolsPanel');
      if (!panel) return;
      panel.dataset.ready = '0';
      this.renderShell();
      this.renderConsole();
      this.renderNetwork();
      this.updateStatus();
      this.updateCounts();
      if (this.activeTab === 'elements') this.loadElements(true);
      if (this.activeTab === 'application') this.loadApplication(true);
    },

    renderShell() {
      const panel = $('devtoolsPanel');
      if (panel.dataset.ready === '1') {
        this.updateStatus();
        return;
      }
      panel.dataset.ready = '1';
      const is = (tab) => (this.activeTab === tab ? 'active' : '');
      panel.innerHTML = `
        <div class="dt-head">
          <div class="dt-brand">${MG.icon('terminal')}<span>MG DevTools</span></div>
          <button class="dt-tab ${is('console')}" data-dt-tab="console">${MG.esc(MG.t('devtools.console'))} <span class="count" id="dtConsoleCount">0</span></button>
          <button class="dt-tab ${is('network')}" data-dt-tab="network">${MG.esc(MG.t('devtools.network'))} <span class="count" id="dtNetworkCount">0</span></button>
          <button class="dt-tab ${is('elements')}" data-dt-tab="elements">${MG.esc(MG.t('devtools.elements'))}</button>
          <button class="dt-tab ${is('application')}" data-dt-tab="application">${MG.esc(MG.t('devtools.application'))}</button>
          <div class="dt-spacer"></div>
          <div class="dt-status" id="dtStatus"><i class="dot"></i><span>${MG.esc(MG.t('devtools.detached'))}</span></div>
          <button class="dt-btn" data-dt="native" title="${MG.esc(MG.t('devtools.native'))}">${MG.icon('external')}</button>
          <button class="dt-btn" data-dt="refresh" title="Refresh">${MG.icon('reload')}</button>
          <button class="dt-btn" data-dt="clear" title="${MG.esc(MG.t('devtools.clear'))}">${MG.icon('trash')}</button>
          <button class="dt-btn" data-dt="close" title="${MG.esc(MG.t('common.close'))}">${MG.icon('close')}</button>
        </div>
        <div class="dt-body">
          <div class="dt-pane ${is('console')}" data-pane="console">
            <div class="dt-console" id="dtConsole" style="flex:1;overflow:auto"></div>
            <div class="dt-input-row">
              <span class="dt-prompt">›</span>
              <input class="dt-input" id="dtPrompt" placeholder="${MG.esc(MG.t('devtools.expression'))}" autocomplete="off" spellcheck="false">
            </div>
          </div>
          <div class="dt-pane ${is('network')}" data-pane="network">
            <div class="dt-net-wrap" id="dtNetWrap" style="flex:1;overflow:auto">
              <table class="dt-table"><thead><tr>
                <th style="width:60px">${MG.esc(MG.t('devtools.status'))}</th>
                <th style="width:56px">${MG.esc(MG.t('devtools.method'))}</th>
                <th>${MG.esc(MG.t('devtools.name'))}</th>
                <th style="width:120px">${MG.esc(MG.t('devtools.type'))}</th>
                <th style="width:78px">${MG.esc(MG.t('devtools.size'))}</th>
                <th style="width:66px">${MG.esc(MG.t('devtools.time'))}</th>
              </tr></thead><tbody id="dtNetBody"></tbody></table>
            </div>
            <div class="dt-net-detail hidden" id="dtNetDetail" style="flex:none;max-height:45%;overflow:auto;border-top:1px solid rgba(255,255,255,.08)"></div>
          </div>
          <div class="dt-pane ${is('elements')}" data-pane="elements">
            <div class="dt-dom" id="dtDom" style="flex:1;overflow:auto"></div>
          </div>
          <div class="dt-pane ${is('application')}" data-pane="application">
            <div class="dt-app-grid" id="dtApp"></div>
          </div>
        </div>`;
    },

    updateStatus() {
      const status = $('dtStatus');
      if (!status) return;
      status.classList.toggle('on', this.attached);
      status.innerHTML = `<i class="dot"></i><span>${MG.esc(this.attached ? MG.t('devtools.attached') : MG.t('devtools.detached'))}</span>`;
    },

    onClick(event) {
      const tabBtn = event.target.closest('[data-dt-tab]');
      if (tabBtn) {
        this.activeTab = tabBtn.dataset.dtTab;
        document.querySelectorAll('[data-dt-tab]').forEach((el) => el.classList.toggle('active', el === tabBtn));
        document.querySelectorAll('.dt-pane').forEach((pane) => pane.classList.toggle('active', pane.dataset.pane === this.activeTab));
        if (this.activeTab === 'elements' && !this.elementsLoaded) this.loadElements();
        if (this.activeTab === 'application' && !this.appLoaded) this.loadApplication();
        return;
      }
      const action = event.target.closest('[data-dt]');
      if (action) {
        const kind = action.dataset.dt;
        if (kind === 'clear') {
          MG.call('devtools:clear');
          this.consoleItems = [];
          this.networkItems = [];
          this.renderConsole();
          this.renderNetwork();
        } else if (kind === 'close') {
          MG.toggleDevtoolsPanel();
        } else if (kind === 'native') {
          MG.call('devtools:native');
        } else if (kind === 'refresh') {
          this.loadElements(true);
          this.loadApplication(true);
        }
        return;
      }
      const row = event.target.closest('[data-net-id]');
      if (row) {
        this.showNetworkDetail(row.dataset.netId);
      }
    },

    handleEvent(msg) {
      if (!msg) return;
      if (msg.type === 'state') {
        this.attached = !!msg.attached;
        this.updateStatus();
        if (this.attached) {
          this.loadElements(true);
        }
        return;
      }
      if (msg.type === 'console') {
        this.consoleItems.push(...(msg.items || []));
        if (this.consoleItems.length > 800) this.consoleItems.splice(0, this.consoleItems.length - 800);
        this.appendConsole(msg.items || []);
        return;
      }
      if (msg.type === 'network') {
        for (const item of msg.items || []) {
          const idx = this.networkItems.findIndex((x) => x.requestId === item.requestId);
          if (idx >= 0) this.networkItems[idx] = item;
          else this.networkItems.push(item);
          this.upsertNetworkRow(item);
        }
        this.updateCounts();
        return;
      }
      if (msg.type === 'cleared') {
        this.consoleItems = [];
        this.networkItems = [];
        this.renderConsole();
        this.renderNetwork();
        return;
      }
      if (msg.type === 'navigated') {
        this.elementsLoaded = false;
        if (this.activeTab === 'elements') this.loadElements();
      }
    },

    updateCounts() {
      const c = $('dtConsoleCount');
      const n = $('dtNetworkCount');
      if (c) c.textContent = String(this.consoleItems.length);
      if (n) n.textContent = String(this.networkItems.length);
    },

    consoleRow(item) {
      const level = item.level || 'log';
      const prefix = { error: '✕', warn: '⚠', info: 'ℹ', debug: '◌' }[level] || '›';
      const args = (item.args || []).map((arg) => {
        const text = arg.type === 'string' ? `"${arg.text}"` : arg.text;
        return arg.type === 'string'
          ? `<span class="dt-log-arg-string">${MG.esc(text)}</span>`
          : MG.esc(text);
      }).join(' ');
      const stack = (item.stack || []).length
        ? `<div class="dt-log-stack">${MG.esc(item.stack.slice(0, 3).join('\n'))}</div>`
        : '';
      const src = item.url
        ? `<span class="dt-log-src">${MG.esc((() => { try { return new URL(item.url).pathname; } catch { return item.url; } })())}${item.line ? ':' + item.line : ''}</span>`
        : '';
      return `<div class="dt-log ${MG.esc(level)}">
        <span class="dt-log-level">${prefix}</span>
        <div class="dt-log-main"><div class="dt-log-args">${args}${src}</div>${stack}</div>
      </div>`;
    },

    renderConsole() {
      const host = $('dtConsole');
      if (!host) return;
      if (!this.consoleItems.length) {
        host.innerHTML = `<div class="dt-empty">${MG.esc(MG.t('devtools.emptyConsole'))}</div>`;
      } else {
        host.innerHTML = this.consoleItems.map((item) => this.consoleRow(item)).join('');
      }
      host.scrollTop = host.scrollHeight;
      this.updateCounts();
    },

    appendConsole(items) {
      const host = $('dtConsole');
      if (!host) return;
      if (!items.length) return;
      if (host.querySelector('.dt-empty')) host.innerHTML = '';
      host.insertAdjacentHTML('beforeend', items.map((item) => this.consoleRow(item)).join(''));
      if (host.scrollHeight - host.scrollTop - host.clientHeight < 120) host.scrollTop = host.scrollHeight;
      this.updateCounts();
    },

    async evaluate(expression) {
      const text = String(expression || '').trim();
      if (!text) return;
      const host = $('dtConsole');
      if (host && host.querySelector('.dt-empty')) host.innerHTML = '';
      const push = (level, value) => {
        const item = {
          level,
          args: [{ type: 'string', text: value }],
          timestamp: Date.now() / 1000
        };
        this.consoleItems.push(item);
        this.appendConsole([item]);
      };
      push('log', `› ${text}`);
      try {
        const result = await MG.call('devtools:evaluate', { expression: text });
        if (!result || result.ok === false) {
          push('error', (result && result.error) || 'Evaluation failed');
        } else {
          const value = result.result ? result.result.text : '';
          push('log', '‹ ' + (value === '' ? 'undefined' : value));
        }
      } catch (err) {
        push('error', err.message);
      }
    },

    netRow(item) {
      const status = item.failed ? 'ERR' : (item.status || (item.finished ? '—' : '…'));
      const cls = item.failed ? 'err' : item.status >= 400 ? 'err' : item.status >= 300 ? 'warn' : item.status >= 200 ? 'ok' : 'muted';
      let name = item.url;
      try {
        const u = new URL(item.url);
        name = u.pathname + (u.search || '');
        if (u.hostname) name = u.hostname + name;
      } catch { /* ignore */ }
      return `<tr data-net-id="${MG.esc(item.requestId)}" style="cursor:default">
        <td class="${cls}">${MG.esc(String(status))}</td>
        <td><span class="dt-method">${MG.esc(item.method || '')}</span></td>
        <td class="url" title="${MG.esc(item.url)}">${MG.esc(name)}</td>
        <td class="muted">${MG.esc(item.type || '')}</td>
        <td class="muted">${MG.esc(MG.formatBytes(item.size || 0))}</td>
        <td class="muted">${MG.esc(item.duration ? item.duration + ' ms' : '—')}</td>
      </tr>`;
    },

    renderNetwork() {
      const body = $('dtNetBody');
      if (!body) return;
      if (!this.networkItems.length) {
        body.innerHTML = `<tr><td colspan="6"><div class="dt-empty">${MG.esc(MG.t('devtools.emptyNetwork'))}</div></td></tr>`;
      } else {
        body.innerHTML = this.networkItems.slice(-400).map((item) => this.netRow(item)).join('');
        const wrap = $('dtNetWrap');
        if (wrap) wrap.scrollTop = wrap.scrollHeight;
      }
      this.updateCounts();
    },

    upsertNetworkRow(item) {
      let body = $('dtNetBody');
      if (!body) return;
      if (body.querySelector('.dt-empty')) {
        body.innerHTML = '';
      }
      const existing = body.querySelector(`[data-net-id="${CSS.escape(item.requestId)}"]`);
      if (existing) existing.outerHTML = this.netRow(item);
      else body.insertAdjacentHTML('beforeend', this.netRow(item));
      const wrap = $('dtNetWrap');
      if (wrap && wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 80) {
        wrap.scrollTop = wrap.scrollHeight;
      }
    },

    showNetworkDetail(id) {
      const item = this.networkItems.find((x) => x.requestId === id);
      const host = $('dtNetDetail');
      if (!item || !host) return;
      if (!host.classList.contains('hidden') && host.dataset.id === id) {
        host.classList.add('hidden');
        return;
      }
      host.dataset.id = id;
      host.classList.remove('hidden');
      const headers = (obj) => Object.entries(obj || {})
        .map(([k, v]) => `<div class="dt-app-row"><span class="k">${MG.esc(k)}</span><span class="v" title="${MG.esc(v)}">${MG.esc(String(v))}</span></div>`)
        .join('') || `<div class="dt-empty" style="padding:10px">—</div>`;
      host.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.07);position:sticky;top:0;background:#0b0d13">
          <span class="dt-method">${MG.esc(item.method)}</span>
          <span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${MG.esc(item.url)}</span>
          <span style="flex:1"></span>
          <button class="dt-btn" data-net-close>${MG.icon('close')}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          <div class="dt-app-col"><div class="dt-app-title">${MG.esc(MG.t('devtools.request'))} · ${MG.esc(MG.t('devtools.headers'))}</div>${headers(item.requestHeaders)}</div>
          <div class="dt-app-col" style="border:0"><div class="dt-app-title">${MG.esc(MG.t('devtools.response'))} · ${MG.esc(MG.t('devtools.headers'))}</div>${headers(item.responseHeaders)}</div>
        </div>`;
      host.querySelector('[data-net-close]').addEventListener('click', () => host.classList.add('hidden'));
    },

    async loadElements(force) {
      const host = $('dtDom');
      if (!host) return;
      if (this.elementsLoaded && !force) return;
      this.elementsLoaded = true;
      host.innerHTML = `<div class="dt-empty">${MG.esc(MG.t('common.loading'))}</div>`;
      const result = await MG.call('devtools:document');
      if (!result || result.error || !result.nodes) {
        host.innerHTML = `<div class="dt-empty">${MG.esc(MG.t('devtools.emptyElements'))}</div>`;
        return;
      }
      const nodes = result.nodes.filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()));
      if (!nodes.length) {
        host.innerHTML = `<div class="dt-empty">${MG.esc(MG.t('devtools.emptyElements'))}</div>`;
        return;
      }
      const html = nodes.slice(0, 1800).map((node) => {
        const pad = 4 + Math.min(node.depth, 24) * 13;
        if (node.nodeType === 3) {
          return `<div class="dt-node" style="padding-inline-start:${pad}px"><span class="dt-text-node">${MG.esc(String(node.nodeValue).slice(0, 140))}</span></div>`;
        }
        const attrs = [];
        for (let i = 0; i < node.attributes.length; i += 2) {
          const name = node.attributes[i];
          const value = node.attributes[i + 1];
          attrs.push(`<span class="dt-attr-name"> ${MG.esc(name)}</span><span class="dt-bracket">=</span><span class="dt-attr-value">"${MG.esc(value)}"</span>`);
        }
        const tag = String(node.nodeName || '').toLowerCase();
        return `<div class="dt-node" style="padding-inline-start:${pad}px"><span class="dt-bracket">&lt;</span><span class="dt-tag">${MG.esc(tag)}</span>${attrs.join('')}<span class="dt-bracket">&gt;</span></div>`;
      }).join('');
      host.innerHTML = html;
    },

    async loadApplication(force) {
      const host = $('dtApp');
      if (!host) return;
      if (this.appLoaded && !force) return;
      this.appLoaded = true;
      host.innerHTML = `<div class="dt-empty" style="grid-column:1/-1">${MG.esc(MG.t('common.loading'))}</div>`;
      const [cookies, storage] = await Promise.all([
        MG.call('devtools:cookies'),
        MG.call('devtools:storage')
      ]);
      const cookieRows = (cookies && cookies.cookies || []).map((c) =>
        `<div class="dt-app-row"><span class="k" title="${MG.esc(c.name)}">${MG.esc(c.name)}</span><span class="v" title="${MG.esc(c.value)}">${MG.esc(String(c.value).slice(0, 80))}</span></div>`
      ).join('');
      const local = storage && storage.ok && storage.result && storage.result.value ? storage.result.value : null;
      const localRows = local
        ? Object.entries(local.localStorage || {}).map(([k, v]) =>
          `<div class="dt-app-row"><span class="k" title="${MG.esc(k)}">${MG.esc(k)}</span><span class="v" title="${MG.esc(v)}">${MG.esc(String(v).slice(0, 90))}</span></div>`).join('')
        : '';
      const sessionRows = local
        ? Object.entries(local.sessionStorage || {}).map(([k, v]) =>
          `<div class="dt-app-row"><span class="k" title="${MG.esc(k)}">${MG.esc(k)}</span><span class="v" title="${MG.esc(v)}">${MG.esc(String(v).slice(0, 90))}</span></div>`).join('')
        : '';
      host.innerHTML = `
        <div class="dt-app-col">
          <div class="dt-app-title">${MG.esc(MG.t('devtools.cookies'))} (${(cookies && cookies.cookies || []).length})</div>
          ${cookieRows || `<div class="dt-empty" style="padding:14px">—</div>`}
          <div class="dt-app-title">${MG.esc(MG.t('devtools.session'))}</div>
          ${sessionRows || `<div class="dt-empty" style="padding:14px">—</div>`}
        </div>
        <div class="dt-app-col" style="border:0">
          <div class="dt-app-title">${MG.esc(MG.t('devtools.storage'))}</div>
          ${localRows || `<div class="dt-empty" style="padding:14px">—</div>`}
        </div>`;
    }
  };

  MG.devtoolsUI = dt;
})();
