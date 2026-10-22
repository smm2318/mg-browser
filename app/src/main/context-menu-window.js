'use strict';

const { BrowserWindow, screen } = require('electron');

/**
 * A small, transparent always-on-top window that renders the MG context menu
 * above embedded WebContentsViews. Native menus cannot be styled, this one can.
 */
class ContextMenuWindow {
  constructor({ parent, preload, html, onClose }) {
    this.parent = parent;
    this.preload = preload;
    this.html = html;
    this.onClose = onClose || (() => {});
    this.win = null;
    this.loaded = false;
    this.actions = new Map();
    this.width = 300;
  }

  ensure() {
    if (this.win && !this.win.isDestroyed()) return this.win;
    this.win = new BrowserWindow({
      width: this.width,
      height: 480,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      show: false,
      hasShadow: true,
      parent: this.parent && !this.parent.isDestroyed() ? this.parent : undefined,
      webPreferences: {
        preload: this.preload,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: false
      }
    });
    this.win.setAlwaysOnTop(true, 'pop-up-menu');
    this.win.loadFile(this.html);
    this.win.webContents.once('did-finish-load', () => { this.loaded = true; });
    this.win.on('blur', () => {
      console.log('[menu] blur');
      if (this.win && this.win.isVisible()) this.close();
    });
    this.win.on('closed', () => {
      this.win = null;
      this.loaded = false;
    });
    return this.win;
  }

  waitLoaded() {
    if (this.loaded) return Promise.resolve();
    return new Promise((resolve) => {
      if (!this.win) return resolve();
      const timer = setTimeout(resolve, 600);
      this.win.webContents.once('did-finish-load', () => { clearTimeout(timer); resolve(); });
    });
  }

  async open({ items, actions, theme, lang, accent, position }) {
    const win = this.ensure();
    this.actions = actions || new Map();
    const height = Math.min(
      720,
      18 + 34 + items.reduce((sum, item) => sum + (item.type === 'separator' ? 9 : 38), 0)
    );
    const point = position || screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const area = display.workArea;
    let x = Math.round(point.x + 2);
    let y = Math.round(point.y + 2);
    if (x + this.width > area.x + area.width - 8) x = area.x + area.width - this.width - 8;
    if (y + height > area.y + area.height - 8) y = area.y + area.height - height - 8;
    x = Math.max(area.x + 8, x);
    y = Math.max(area.y + 8, y);

    win.setBounds({ x, y, width: this.width, height });
    await this.waitLoaded();
    win.webContents.send('menu:data', {
      items,
      theme: theme || 'dark',
      lang: lang === 'fa' ? 'fa' : 'en',
      accent: accent || '#7c5cff'
    });
    console.log('[menu] showing at', x, y, 'size', this.width, height, 'items', items.length);
    win.show();
    win.focus();
    setTimeout(() => {
      if (this.win && !this.win.isDestroyed()) {
        console.log('[menu] visible', this.win.isVisible(), 'focused', this.win.isFocused());
      }
    }, 600);
  }

  pick(id) {
    const run = this.actions.get(id);
    this.close();
    if (run) setTimeout(() => { try { run(); } catch (err) { console.error('[menu]', err); } }, 10);
  }

  close() {
    if (this.win && !this.win.isDestroyed() && this.win.isVisible()) {
      this.win.hide();
      this.onClose();
    }
  }
}

module.exports = { ContextMenuWindow };
