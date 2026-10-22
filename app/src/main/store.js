'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SETTINGS = {
  theme: 'system',               // system | light | dark
  accent: '#7c5cff',
  language: 'en',                // en | fa
  searchEngine: 'google',
  customSearchEngines: [],       // [{ id, name, url, color }]
  homepage: 'mg://newtab',
  newTabUrl: 'mg://newtab',
  restoreSession: true,
  askDownloadPath: true,
  downloadPath: '',
  savePasswords: true,
  autofillPasswords: true,
  doNotTrack: true,
  blockTrackers: false,
  omniboxSuggestions: true,
  liveResults: true,
  openLinksInNewTab: false,
  compactTabs: false,
  showTabTooltips: true,
  smoothScrolling: true,
  confirmBeforeQuit: false,
  devtoolsDock: 'bottom',
  devtoolsHeight: 320,
  sidebarWidth: 380,
  contextMenu: {
    back: true,
    forward: true,
    reload: true,
    savePage: true,
    viewSource: true,
    print: true,
    copy: true,
    paste: true,
    selectAll: true,
    copyLink: true,
    openLinkNewTab: true,
    openLinkSplit: true,
    saveLink: true,
    copyImage: true,
    copyImageAddress: true,
    saveImage: true,
    searchSelection: true,
    translateSelection: true,
    copyAsMarkdown: true,
    inspect: true,
    inspectNative: true,
    customActions: true
  },
  customContextActions: [],      // [{ id, label, urlTemplate }]
  lastVersion: '1.0.0'
};

const DEFAULTS = {
  version: 1,
  settings: DEFAULT_SETTINGS,
  passwords: null,               // encrypted blob
  profile: { name: '', email: '', avatar: '', source: 'local' },
  downloads: [],
  history: [],
  bookmarks: [],
  session: { tabs: [], activeId: null, split: null },
  extensions: [],
  knownOrigins: [],
  dismissedSites: []
};

function deepMerge(base, extra) {
  if (Array.isArray(base)) return Array.isArray(extra) ? extra : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const [k, v] of Object.entries(extra || {})) {
      out[k] = k in base ? deepMerge(base[k], v) : v;
    }
    return out;
  }
  return extra === undefined ? base : extra;
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'mg-data.json');
    this.data = this._load();
    this._timer = null;
  }

  _load() {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      return deepMerge(DEFAULTS, parsed);
    } catch {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  get settings() {
    return this.data.settings;
  }

  get path() {
    return this.file;
  }

  save(immediate = false) {
    if (immediate) {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      this._write();
      return;
    }
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this._write();
    }, 250);
  }

  _write() {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[store] write failed', err);
    }
  }

  updateSettings(patch) {
    this.data.settings = deepMerge(this.data.settings, patch || {});
    this.save();
    return this.data.settings;
  }

  resetSettings() {
    this.data.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
    return this.data.settings;
  }

  addHistory(entry) {
    if (!entry || !entry.url) return;
    if (!/^https?:/i.test(entry.url)) return;
    const history = this.data.history;
    const idx = history.findIndex((h) => h.url === entry.url);
    if (idx !== -1) history.splice(idx, 1);
    history.unshift({
      url: entry.url,
      title: entry.title || entry.url,
      favicon: entry.favicon || '',
      visitedAt: Date.now()
    });
    if (history.length > 4000) history.length = 4000;
    this.save();
  }

  updateHistoryMeta(url, meta) {
    const item = this.data.history.find((h) => h.url === url);
    if (!item) return;
    if (meta.title) item.title = meta.title;
    if (meta.favicon) item.favicon = meta.favicon;
    this.save();
  }

  isBookmarked(url) {
    return this.data.bookmarks.some((b) => b.url === url);
  }

  toggleBookmark({ url, title, favicon }) {
    const idx = this.data.bookmarks.findIndex((b) => b.url === url);
    if (idx >= 0) {
      this.data.bookmarks.splice(idx, 1);
      this.save();
      return false;
    }
    this.data.bookmarks.unshift({ url, title: title || url, favicon: favicon || '', addedAt: Date.now() });
    this.save();
    return true;
  }
}

module.exports = { Store, DEFAULT_SETTINGS };
