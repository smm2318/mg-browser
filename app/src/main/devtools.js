'use strict';

/**
 * MG DevTools — a slim Chrome DevTools bridge built on the CDP debugger.
 * It captures console output, network activity, the DOM tree and storage
 * so the browser can render its own inspector inside the chrome UI.
 */
class DevtoolsBridge {
  constructor(send) {
    this.send = send;
    this.wc = null;
    this.tabId = null;
    this.consoleItems = [];
    this.networkItems = [];
    this.networkIndex = new Map();
    this.seq = 0;
    this.pendingConsole = [];
    this.pendingNetwork = [];
    this.flushTimer = null;
    this._onMessage = this._onMessage.bind(this);
    this._onDetach = this._onDetach.bind(this);
  }

  get attached() {
    return !!(this.wc && this.wc.debugger && this.wc.debugger.isAttached());
  }

  async attach(wc, tabId) {
    if (!wc || wc.isDestroyed()) return false;
    if (this.wc === wc && this.attached) return true;
    this.detach();
    this.wc = wc;
    this.tabId = tabId;
    try {
      wc.debugger.attach('1.3');
    } catch (err) {
      // Already attached by something else (e.g. native devtools).
      this.wc = null;
      return false;
    }
    wc.debugger.on('message', this._onMessage);
    wc.debugger.on('detach', this._onDetach);
    try {
      await wc.debugger.sendCommand('Runtime.enable');
      await wc.debugger.sendCommand('Log.enable');
      await wc.debugger.sendCommand('Network.enable', { maxTotalBufferSize: 40000000 });
      await wc.debugger.sendCommand('DOM.enable');
      await wc.debugger.sendCommand('Page.enable');
    } catch (err) {
      console.error('[devtools] enable failed', err.message);
    }
    this.send({ type: 'state', attached: true, tabId });
    return true;
  }

  detach() {
    if (this.wc && !this.wc.isDestroyed() && this.wc.debugger.isAttached()) {
      this.wc.debugger.removeListener('message', this._onMessage);
      this.wc.debugger.removeListener('detach', this._onDetach);
      try { this.wc.debugger.detach(); } catch { /* ignore */ }
    }
    this.wc = null;
    this.tabId = null;
    this.send({ type: 'state', attached: false, tabId: null });
  }

  _onDetach() {
    this.wc = null;
    this.tabId = null;
    this.send({ type: 'state', attached: false, tabId: null });
  }

  _pushConsole(item) {
    item.id = 'c' + (++this.seq);
    this.consoleItems.push(item);
    if (this.consoleItems.length > 800) this.consoleItems.splice(0, this.consoleItems.length - 800);
    this.pendingConsole.push(item);
    this._scheduleFlush();
  }

  _pushNetwork(item) {
    item.id = 'n' + (++this.seq);
    this.networkItems.push(item);
    if (this.networkItems.length > 500) this.networkItems.splice(0, this.networkItems.length - 500);
    this.pendingNetwork.push(item);
    this._scheduleFlush();
  }

  _scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      const con = this.pendingConsole.splice(0);
      const net = this.pendingNetwork.splice(0);
      if (con.length) this.send({ type: 'console', items: con });
      if (net.length) this.send({ type: 'network', items: net });
    }, 120);
  }

  _onMessage(event, method, params) {
    switch (method) {
      case 'Runtime.consoleAPICalled': {
        const level = params.type === 'warning' ? 'warn' : params.type;
        this._pushConsole({
          level: ['log', 'info', 'warn', 'error', 'debug', 'dir'].includes(level) ? level : 'log',
          args: (params.args || []).map(describeRemote),
          timestamp: params.timestamp,
          stack: formatFrames(params.stackTrace && params.stackTrace.callFrames)
        });
        break;
      }
      case 'Runtime.exceptionThrown': {
        const d = params.exceptionDetails || {};
        this._pushConsole({
          level: 'error',
          args: [{ type: 'error', text: d.text || 'Uncaught exception' }, { type: 'string', text: d.exception && (d.exception.description || d.exception.value) || '' }],
          timestamp: Date.now() / 1000,
          stack: formatFrames(d.stackTrace && d.stackTrace.callFrames),
          url: d.url,
          line: (d.lineNumber || 0) + 1
        });
        break;
      }
      case 'Log.entryAdded': {
        const e = params.entry || {};
        if (!e.text) break;
        this._pushConsole({
          level: e.level === 'warning' ? 'warn' : (e.level || 'info'),
          args: [{ type: 'string', text: e.text }],
          timestamp: e.timestamp,
          url: e.url,
          line: e.lineNumber,
          source: e.source
        });
        break;
      }
      case 'Network.requestWillBeSent': {
        const r = params.request || {};
        const item = {
          requestId: params.requestId,
          method: r.method || 'GET',
          url: r.url || '',
          type: params.type || 'Other',
          status: 0,
          mime: '',
          size: 0,
          startedAt: Date.now(),
          duration: 0,
          finished: false,
          failed: false,
          requestHeaders: r.headers || {},
          requestBody: r.postData ? String(r.postData).slice(0, 4000) : '',
          responseHeaders: {},
          fromCache: false
        };
        this.networkIndex.set(params.requestId, item);
        this._pushNetwork(item);
        break;
      }
      case 'Network.responseReceived': {
        const item = this.networkIndex.get(params.requestId);
        if (!item) break;
        const r = params.response || {};
        item.status = r.status;
        item.mime = r.mimeType;
        item.responseHeaders = r.headers || {};
        item.fromCache = !!r.fromDiskCache;
        item.protocol = r.protocol;
        this._pushNetwork(item);
        break;
      }
      case 'Network.loadingFinished': {
        const item = this.networkIndex.get(params.requestId);
        if (!item) break;
        item.finished = true;
        item.size = params.encodedDataLength || 0;
        item.duration = Date.now() - item.startedAt;
        this._pushNetwork(item);
        break;
      }
      case 'Network.loadingFailed': {
        const item = this.networkIndex.get(params.requestId);
        if (!item) break;
        item.finished = true;
        item.failed = true;
        item.errorText = params.errorText;
        item.duration = Date.now() - item.startedAt;
        this._pushNetwork(item);
        break;
      }
      case 'Page.frameNavigated': {
        if (params.frame && !params.frame.parentId) {
          this.send({ type: 'navigated', url: params.frame.url });
        }
        break;
      }
      default:
        break;
    }
  }

  async evaluate(expression) {
    if (!this.attached) return { ok: false, error: 'DevTools is not attached' };
    try {
      const res = await this.wc.debugger.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
        generatePreview: true
      });
      if (res.exceptionDetails) {
        return {
          ok: false,
          error: res.exceptionDetails.text || 'Evaluation failed',
          detail: res.exceptionDetails.exception ? res.exceptionDetails.exception.description : ''
        };
      }
      return { ok: true, result: describeRemote(res.result) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async getDocument() {
    if (!this.attached) return { nodes: [] };
    try {
      const res = await this.wc.debugger.sendCommand('DOM.getDocument', { depth: -1, pierce: false });
      const nodes = [];
      const walk = (node, depth) => {
        if (!nodes || depth > 60) return;
        if (!node) return;
        if (nodes.length > 2600) return;
        nodes.push({
          nodeId: node.nodeId,
          parentId: node.parentId || 0,
          depth,
          nodeType: node.nodeType,
          nodeName: node.nodeName,
          nodeValue: node.nodeValue,
          attributes: node.attributes || [],
          childCount: node.childNodeCount || 0
        });
        for (const child of node.children || []) walk(child, depth + 1);
      };
      walk(res.root, 0);
      return { nodes };
    } catch (err) {
      return { nodes: [], error: err.message };
    }
  }

  async getCookies() {
    if (!this.attached) return { cookies: [] };
    try {
      const res = await this.wc.debugger.sendCommand('Network.getAllCookies');
      return { cookies: (res.cookies || []).slice(0, 300) };
    } catch (err) {
      return { cookies: [], error: err.message };
    }
  }

  async getStorage() {
    return this.evaluate(`(() => {
      const dump = (s) => Object.fromEntries(Object.keys(s).slice(0, 100).map(k => [k, String(s.getItem(k)).slice(0, 300)]));
      return { localStorage: dump(window.localStorage), sessionStorage: dump(window.sessionStorage) };
    })()`);
  }

  clear() {
    this.consoleItems = [];
    this.networkItems = [];
    this.networkIndex.clear();
    this.send({ type: 'cleared' });
  }

  snapshot() {
    return {
      console: this.consoleItems,
      network: this.networkItems,
      attached: this.attached,
      tabId: this.tabId
    };
  }
}

function shortUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

const INTERNAL_FRAME = /electron\/js2c|sandbox_bundle|node:internal|node_modules\/electron/i;

function formatFrames(frames) {
  return (frames || [])
    .filter((f) => !INTERNAL_FRAME.test(f.url || '') && !INTERNAL_FRAME.test(f.functionName || ''))
    .slice(0, 5)
    .map((f) => `${f.functionName || '(anonymous)'} (${shortUrl(f.url) || 'eval'}:${(f.lineNumber || 0) + 1})`);
}

function describeRemote(remote) {
  if (!remote) return { type: 'undefined', text: 'undefined' };
  if ('value' in remote) {
    const v = remote.value;
    let text;
    if (v === null) text = 'null';
    else if (typeof v === 'object') {
      try { text = JSON.stringify(v); } catch { text = String(v); }
    } else text = String(v);
    return { type: remote.type || typeof v, text: text.slice(0, 2000), value: v };
  }
  if (remote.unserializableValue !== undefined) {
    return { type: remote.type, text: remote.unserializableValue };
  }
  return {
    type: remote.type,
    text: (remote.description || remote.className || remote.type || '').slice(0, 2000)
  };
}

module.exports = { DevtoolsBridge };
