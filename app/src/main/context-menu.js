'use strict';

const { Menu, clipboard, shell, app } = require('electron');

function buildPageMenu({ params, tab, settings, actions, engines, searchEngineName }) {
  const cfg = settings.contextMenu || {};
  const wc = tab && tab.view ? tab.view.webContents : null;
  const has = (v) => typeof v === 'string' && v.length > 0;
  const link = params.linkURL;
  const media = params.mediaType;
  const sel = (params.selectionText || '').trim();
  const items = [];

  const push = (cond, item) => { if (cond) items.push(item); };
  const sep = () => { if (items.length && items[items.length - 1].type !== 'separator') items.push({ type: 'separator' }); };

  if (link) {
    push(cfg.openLinkNewTab !== false, { label: 'Open link in new tab', click: () => actions.openTab(link, { activate: false }) });
    push(cfg.openLinkSplit !== false, { label: 'Open link in split view', click: () => actions.openSplit(link) });
    push(cfg.saveLink !== false, { label: 'Save link as…', click: () => wc && wc.downloadURL(link) });
    push(cfg.copyLink !== false, { label: 'Copy link address', click: () => clipboard.writeText(link) });
    push(cfg.copyLink !== false, { label: 'Copy link as Markdown', click: () => clipboard.writeText(`[${params.linkText || link}](${link})`) });
    sep();
  }

  if (media && (params.srcURL || params.mediaType === 'image')) {
    const src = params.srcURL;
    push(cfg.saveImage !== false, { label: 'Save image as…', click: () => wc && wc.downloadURL(src) });
    push(cfg.openLinkNewTab !== false, { label: 'Open image in new tab', click: () => actions.openTab(src, { activate: false }) });
    push(cfg.copyImage !== false, { label: 'Copy image', click: () => wc && wc.copyImageAt(params.x, params.y) });
    push(cfg.copyImageAddress !== false, { label: 'Copy image address', click: () => clipboard.writeText(src) });
    sep();
  }

  if (sel) {
    push(cfg.copy !== false, { label: 'Copy', role: 'copy', enabled: !!(params.editFlags && params.editFlags.canCopy) });
    push(cfg.searchSelection !== false, {
      label: `Search ${searchEngineName || 'the web'} for “${trim(sel)}”`,
      click: () => actions.searchInNewTab(sel)
    });
    if (engines && engines.length) {
      items.push({
        label: 'Search selection with…',
        submenu: engines.filter((e) => e.id !== settings.searchEngine).slice(0, 8).map((e) => ({
          label: e.name,
          click: () => actions.searchInNewTab(sel, e.id)
        }))
      });
    }
    push(cfg.translateSelection !== false, {
      label: 'Translate selection',
      click: () => actions.openTab('https://translate.google.com/?sl=auto&tl=' + (settings.language === 'fa' ? 'fa' : 'en') + '&text=' + encodeURIComponent(sel), { activate: true })
    });
    push(cfg.copyAsMarkdown !== false && !link, { label: 'Copy as Markdown', click: () => clipboard.writeText(sel) });
    sep();
  }

  if (params.isEditable) {
    push(cfg.copy !== false, { label: 'Undo', role: 'undo', enabled: !!(params.editFlags && params.editFlags.canUndo) });
    push(cfg.copy !== false, { label: 'Redo', role: 'redo', enabled: !!(params.editFlags && params.editFlags.canRedo) });
    sep();
    push(cfg.copy !== false, { label: 'Cut', role: 'cut', enabled: !!(params.editFlags && params.editFlags.canCut) });
    push(cfg.copy !== false, { label: 'Copy', role: 'copy', enabled: !!(params.editFlags && params.editFlags.canCopy) });
    push(cfg.paste !== false, { label: 'Paste', role: 'paste', enabled: !!(params.editFlags && params.editFlags.canPaste) });
    push(cfg.selectAll !== false, { label: 'Select all', role: 'selectAll' });
    sep();
  }

  if (params.misspelledWord) {
    for (const suggestion of (params.dictionarySuggestions || []).slice(0, 5)) {
      items.push({ label: suggestion, click: () => wc && wc.replaceMisspelling(suggestion) });
    }
    if (!items.length || items[items.length - 1].type === 'separator') {
      items.push({ label: 'No spelling suggestions', enabled: false });
    }
    items.push({
      label: `Add “${trim(params.misspelledWord, 24)}” to dictionary`,
      click: () => wc && wc.session.addWordToSpellCheckerDictionary(params.misspelledWord)
    });
    sep();
  }

  push(cfg.back !== false, { label: 'Back', enabled: !!(tab && tab.canGoBack), click: () => actions.goBack() });
  push(cfg.forward !== false, { label: 'Forward', enabled: !!(tab && tab.canGoForward), click: () => actions.goForward() });
  push(cfg.reload !== false, { label: 'Reload', click: () => actions.reload() });
  sep();
  push(cfg.viewSource !== false, {
    label: 'View page source',
    enabled: !!(tab && /^https?:/.test(tab.url || '')),
    click: () => actions.openTab('view-source:' + tab.url, { activate: false })
  });
  push(cfg.savePage !== false, {
    label: 'Save page as…',
    click: () => wc && wc.downloadURL(tab.url)
  });
  push(cfg.print !== false, { label: 'Print…', click: () => wc && wc.print() });
  sep();
  push(cfg.inspect !== false, { label: 'Inspect element (MG DevTools)', click: () => actions.openDevtoolsPanel() });
  push(cfg.inspectNative !== false, { label: 'Inspect element (native DevTools)', click: () => actions.openNativeDevtools() });

  if (cfg.customActions !== false && Array.isArray(settings.customContextActions) && settings.customContextActions.length) {
    sep();
    items.push({
      label: 'Custom actions',
      submenu: settings.customContextActions.map((a) => ({
        label: a.label || 'Action',
        click: () => {
          const target = sel || (tab && tab.url) || '';
          const url = String(a.urlTemplate || '').replace(/%s/g, encodeURIComponent(target));
          if (url) actions.openTab(url, { activate: true });
        }
      }))
    });
  }

  return Menu.buildFromTemplate(items.filter((i, idx) => i && (i.type === 'separator' ? idx > 0 : true)));
}

function buildTabMenu({ tab, settings, actions }) {
  return Menu.buildFromTemplate([
    { label: 'New tab', click: () => actions.newTab() },
    { label: 'Reload', click: () => actions.reloadTab(tab.id) },
    { label: 'Duplicate', click: () => actions.duplicateTab(tab.id) },
    { type: 'separator' },
    { label: tab.pinned ? 'Unpin tab' : 'Pin tab', click: () => actions.pinTab(tab.id, !tab.pinned) },
    { label: tab.muted ? 'Unmute tab' : 'Mute tab', click: () => actions.muteTab(tab.id, !tab.muted) },
    { label: 'Open in split view', enabled: !!actions.canSplit, click: () => actions.splitWith(tab.id) },
    { type: 'separator' },
    { label: 'Close tab', click: () => actions.closeTab(tab.id) },
    { label: 'Close other tabs', click: () => actions.closeOthers(tab.id) },
    { label: 'Close tabs to the right', click: () => actions.closeRight(tab.id) },
    { type: 'separator' },
    { label: 'Copy page address', click: () => clipboard.writeText(tab.url || '') }
  ]);
}

function buildProfileMenu({ profile, actions }) {
  const header = {
    label: profile && (profile.email || profile.name)
      ? `${profile.name || 'Google account'}\n${profile.email || ''}`
      : 'Not signed in',
    enabled: false
  };
  const items = [
    header,
    { type: 'separator' },
    { label: 'Manage Google account', click: () => actions.openTab('https://myaccount.google.com/', { activate: true }) },
    { label: 'Change profile photo…', click: () => actions.changeAvatar() },
    { label: 'Remove custom photo', click: () => actions.clearAvatar() },
    { type: 'separator' },
    { label: 'Passwords', click: () => actions.openPasswords() },
    { label: 'Settings', click: () => actions.openSettings() }
  ];
  return Menu.buildFromTemplate(items);
}

function buildMainMenu({ settings, actions, recentHistory, isBookmarked }) {
  const historyItems = (recentHistory || []).map((h) => ({
    label: trim(h.title || h.url, 60),
    click: () => actions.openTab(h.url, { activate: true })
  }));
  if (!historyItems.length) historyItems.push({ label: 'No history yet', enabled: false });
  historyItems.push({ type: 'separator' }, { label: 'Clear history…', click: () => actions.clearHistory() });

  return Menu.buildFromTemplate([
    { label: 'New tab', accelerator: 'CmdOrCtrl+T', click: () => actions.newTab() },
    { label: 'New split view', accelerator: 'CmdOrCtrl+Shift+S', click: () => actions.newSplit() },
    { type: 'separator' },
    { label: isBookmarked ? 'Remove bookmark' : 'Bookmark this page', accelerator: 'CmdOrCtrl+D', click: () => actions.toggleBookmark() },
    { label: 'History', submenu: historyItems },
    { label: 'Downloads', accelerator: 'CmdOrCtrl+J', click: () => actions.openDownloads() },
    { label: 'Passwords', click: () => actions.openPasswords() },
    { type: 'separator' },
    {
      label: 'Zoom',
      submenu: [
        { label: 'Zoom in', accelerator: 'CmdOrCtrl+Plus', click: () => actions.zoom(0.5) },
        { label: 'Zoom out', accelerator: 'CmdOrCtrl+-', click: () => actions.zoom(-0.5) },
        { label: 'Reset zoom', accelerator: 'CmdOrCtrl+0', click: () => actions.zoom(0) }
      ]
    },
    { label: 'Find in page…', accelerator: 'CmdOrCtrl+F', click: () => actions.find() },
    { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => actions.print() },
    { type: 'separator' },
    { label: 'MG DevTools', accelerator: 'F12', click: () => actions.openDevtools() },
    { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => actions.openSettings() },
    { type: 'separator' },
    { label: 'About MG Browser', click: () => actions.about() },
    { label: 'Quit', role: 'quit' }
  ]);
}

function trim(text, max = 40) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

module.exports = { buildPageMenu, buildTabMenu, buildProfileMenu, buildMainMenu };
