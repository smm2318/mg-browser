'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { app, dialog, shell, clipboard } = require('electron');

function uniquePath(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = path.join(dir, filename);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${i})${ext}`);
    i += 1;
  }
  return candidate;
}

class DownloadManager {
  constructor({ session, store, getWindow, getSettings, onChange }) {
    this.session = session;
    this.store = store;
    this.getWindow = getWindow;
    this.getSettings = getSettings;
    this.onChange = onChange || (() => {});
    this.items = new Map();
    this.order = [];
    this.active = new Map();
    this.seq = 0;
    this._flushTimer = null;
    this._restore();
    this.session.on('will-download', (event, item) => this._handle(event, item));
  }

  _restore() {
    const saved = Array.isArray(this.store.data.downloads) ? this.store.data.downloads : [];
    for (const entry of saved.slice(0, 150)) {
      if (!entry || !entry.id) continue;
      const restored = { ...entry };
      if (restored.state === 'progressing' || restored.state === 'paused') {
        restored.state = 'interrupted';
      }
      this.items.set(entry.id, restored);
      this.order.push(entry.id);
    }
  }

  _persist() {
    const saveable = this.order
      .slice(0, 150)
      .map((id) => this.items.get(id))
      .filter(Boolean)
      .map(({ id, filename, url, path: filePath, totalBytes, startedAt, state, mime, origin }) => ({
        id, filename, url, path: filePath, totalBytes, startedAt, state, mime, origin
      }));
    this.store.data.downloads = saveable;
    this.store.save();
  }

  _handle(event, item) {
    const settings = this.getSettings();
    const id = 'dl-' + Date.now() + '-' + (++this.seq);
    const filename = item.getFilename();
    const dir = settings.downloadPath || app.getPath('downloads');
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
    const suggested = path.join(dir, filename);

    let target = suggested;
    if (settings.askDownloadPath) {
      const win = this.getWindow();
      const result = dialog.showSaveDialogSync(win, {
        title: 'Save file',
        defaultPath: suggested,
        buttonLabel: 'Save'
      });
      if (!result) {
        item.cancel();
        return;
      }
      target = result;
    } else {
      target = uniquePath(dir, filename);
    }

    item.setSavePath(target);
    const entry = {
      id,
      filename: path.basename(target),
      url: item.getURL(),
      origin: (() => { try { return new URL(item.getURL()).host; } catch { return ''; } })(),
      path: target,
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      paused: false,
      startedAt: Date.now(),
      mime: item.getMimeType(),
      savePath: target
    };
    this.items.set(id, entry);
    this.order.unshift(id);
    this.active.set(id, item);
    this._emit();

    const update = () => {
      entry.receivedBytes = item.getReceivedBytes();
      entry.totalBytes = item.getTotalBytes();
      entry.paused = item.isPaused();
      entry.state = item.isPaused() ? 'paused' : 'progressing';
      this._throttledEmit();
    };

    item.on('updated', (e, state) => {
      if (state === 'interrupted') {
        entry.state = 'interrupted';
        this._emit();
        return;
      }
      update();
    });

    item.once('done', (e, state) => {
      entry.receivedBytes = item.getReceivedBytes();
      entry.totalBytes = item.getTotalBytes();
      entry.state =
        state === 'completed' ? 'completed' :
        state === 'cancelled' ? 'cancelled' : 'interrupted';
      entry.completedAt = Date.now();
      this.active.delete(id);
      this._persist();
      this._emit();
    });

    if (settings.askDownloadPath === false) this._emit();
  }

  _throttledEmit() {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this._emit();
    }, 250);
  }

  _emit() {
    this.onChange(this.list());
  }

  list() {
    return this.order.map((id) => this.items.get(id)).filter(Boolean);
  }

  pause(id) {
    const item = this.active.get(id);
    if (item && !item.isPaused()) item.pause();
    return true;
  }

  resume(id) {
    const item = this.active.get(id);
    if (item) item.resume();
    return true;
  }

  cancel(id) {
    const item = this.active.get(id);
    if (item) item.cancel();
    const entry = this.items.get(id);
    if (entry) {
      entry.state = 'cancelled';
      this._emit();
    }
    return true;
  }

  open(id) {
    const entry = this.items.get(id);
    if (!entry || !entry.path) return false;
    shell.openPath(entry.path);
    return true;
  }

  reveal(id) {
    const entry = this.items.get(id);
    if (!entry || !entry.path) return false;
    shell.showItemInFolder(entry.path);
    return true;
  }

  copyLink(id) {
    const entry = this.items.get(id);
    if (!entry) return false;
    clipboard.writeText(entry.url);
    return true;
  }

  remove(id) {
    this.items.delete(id);
    this.order = this.order.filter((x) => x !== id);
    this._persist();
    this._emit();
    return true;
  }

  clear() {
    for (const entry of this.list()) {
      if (entry.state === 'progressing' || entry.state === 'paused') {
        const item = this.active.get(entry.id);
        if (item) item.cancel();
      }
    }
    this.items.clear();
    this.order = [];
    this._persist();
    this._emit();
    return true;
  }
}

module.exports = { DownloadManager };
