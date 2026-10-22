'use strict';

const { Menu, clipboard, shell } = require('electron');

const TEXT = {
  en: {
    openLinkNewTab: 'Open link in new tab',
    openLinkSplit: 'Open link in split view',
    saveLink: 'Save link as…',
    copyLink: 'Copy link address',
    copyLinkMarkdown: 'Copy link as Markdown',
    saveImage: 'Save image as…',
    openImageNewTab: 'Open image in new tab',
    copyImage: 'Copy image',
    copyImageAddress: 'Copy image address',
    copy: 'Copy',
    searchFor: 'Search {engine} for “{q}”',
    searchWith: 'Search selection with…',
    translate: 'Translate selection',
    copyMarkdown: 'Copy as Markdown',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    paste: 'Paste',
    selectAll: 'Select all',
    noSpelling: 'No spelling suggestions',
    addDictionary: 'Add “{word}” to dictionary',
    back: 'Back',
    forward: 'Forward',
    reload: 'Reload',
    viewSource: 'View page source',
    savePage: 'Save page as…',
    print: 'Print…',
    inspectMg: 'Inspect element (MG DevTools)',
    inspectNative: 'Inspect element (native DevTools)',
    customActions: 'Custom actions',
    customizeMenu: 'Customize this menu…',
    newTab: 'New tab',
    duplicate: 'Duplicate',
    pin: 'Pin tab',
    unpin: 'Unpin tab',
    mute: 'Mute tab',
    unmute: 'Unmute tab',
    openSplit: 'Open in split view',
    closeTab: 'Close tab',
    closeOthers: 'Close other tabs',
    closeRight: 'Close tabs to the right',
    copyAddress: 'Copy page address',
    notSignedIn: 'Not signed in',
    manageGoogle: 'Manage Google account',
    changePhoto: 'Change profile photo…',
    removePhoto: 'Remove custom photo',
    passwords: 'Passwords',
    settings: 'Settings',
    newSplit: 'New split view',
    bookmark: 'Bookmark this page',
    removeBookmark: 'Remove bookmark',
    history: 'History',
    clearHistory: 'Clear history…',
    noHistory: 'No history yet',
    downloads: 'Downloads',
    zoom: 'Zoom',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset zoom',
    find: 'Find in page…',
    devtools: 'MG DevTools',
    about: 'About MG Browser',
    quit: 'Quit'
  },
  fa: {
    openLinkNewTab: 'باز کردن پیوند در تب جدید',
    openLinkSplit: 'باز کردن پیوند در نمای تقسیم‌شده',
    saveLink: 'ذخیره پیوند…',
    copyLink: 'کپی نشانی پیوند',
    copyLinkMarkdown: 'کپی پیوند به‌صورت Markdown',
    saveImage: 'ذخیره تصویر…',
    openImageNewTab: 'باز کردن تصویر در تب جدید',
    copyImage: 'کپی تصویر',
    copyImageAddress: 'کپی نشانی تصویر',
    copy: 'کپی',
    searchFor: 'جستجوی «{q}» با {engine}',
    searchWith: 'جستجوی متن انتخاب‌شده با…',
    translate: 'ترجمه متن انتخاب‌شده',
    copyMarkdown: 'کپی به‌صورت Markdown',
    undo: 'واگرد',
    redo: 'ازنو',
    cut: 'برش',
    paste: 'چسباندن',
    selectAll: 'انتخاب همه',
    noSpelling: 'پیشنهاد املایی وجود ندارد',
    addDictionary: 'افزودن «{word}» به واژه‌نامه',
    back: 'عقب',
    forward: 'جلو',
    reload: 'بارگذاری مجدد',
    viewSource: 'نمایش سورس صفحه',
    savePage: 'ذخیره صفحه…',
    print: 'چاپ…',
    inspectMg: 'بررسی عنصر (ابزار MG)',
    inspectNative: 'بررسی عنصر (DevTools بومی)',
    customActions: 'اکشن‌های سفارشی',
    customizeMenu: 'شخصی‌سازی این منو…',
    newTab: 'تب جدید',
    duplicate: 'تکثیر',
    pin: 'سنجاق کردن تب',
    unpin: 'برداشتن سنجاق',
    mute: 'بی‌صدا کردن',
    unmute: 'باصدا کردن',
    openSplit: 'باز کردن در نمای تقسیم‌شده',
    closeTab: 'بستن تب',
    closeOthers: 'بستن تب‌های دیگر',
    closeRight: 'بستن تب‌های سمت راست',
    copyAddress: 'کپی نشانی صفحه',
    notSignedIn: 'وارد نشده‌اید',
    manageGoogle: 'مدیریت حساب گوگل',
    changePhoto: 'تغییر تصویر پروفایل…',
    removePhoto: 'حذف تصویر سفارشی',
    passwords: 'رمزهای عبور',
    settings: 'تنظیمات',
    newSplit: 'نمای تقسیم‌شده جدید',
    bookmark: 'نشانک کردن این صفحه',
    removeBookmark: 'حذف نشانک',
    history: 'تاریخچه',
    clearHistory: 'پاک کردن تاریخچه…',
    noHistory: 'تاریخچه‌ای وجود ندارد',
    downloads: 'دانلودها',
    zoom: 'بزرگ‌نمایی',
    zoomIn: 'بزرگ‌نمایی',
    zoomOut: 'کوچک‌نمایی',
    resetZoom: 'بازنشانی بزرگ‌نمایی',
    find: 'جستجو در صفحه…',
    devtools: 'ابزار توسعه MG',
    about: 'درباره مرورگر MG',
    quit: 'خروج'
  }
};

function makeL(lang) {
  const dict = TEXT[lang === 'fa' ? 'fa' : 'en'];
  return (key, vars) => {
    let value = dict[key] || TEXT.en[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) value = value.split('{' + k + '}').join(String(v));
    }
    return value;
  };
}

function buildPageMenu({ params, tab, settings, actions, engines, searchEngineName, lang = 'en' }) {
  const L = makeL(lang);
  const cfg = settings.contextMenu || {};
  const wc = tab && tab.view ? tab.view.webContents : null;
  const link = params.linkURL;
  const media = params.mediaType;
  const sel = (params.selectionText || '').trim();
  const items = [];

  const push = (cond, item) => { if (cond) items.push(item); };
  const sep = () => { if (items.length && items[items.length - 1].type !== 'separator') items.push({ type: 'separator' }); };

  if (link) {
    push(cfg.openLinkNewTab !== false, { label: L('openLinkNewTab'), click: () => actions.openTab(link, { activate: false }) });
    push(cfg.openLinkSplit !== false, { label: L('openLinkSplit'), click: () => actions.openSplit(link) });
    push(cfg.saveLink !== false, { label: L('saveLink'), click: () => wc && wc.downloadURL(link) });
    push(cfg.copyLink !== false, { label: L('copyLink'), click: () => clipboard.writeText(link) });
    push(cfg.copyLink !== false, { label: L('copyLinkMarkdown'), click: () => clipboard.writeText(`[${params.linkText || link}](${link})`) });
    sep();
  }

  if (media && (params.srcURL || media === 'image')) {
    const src = params.srcURL;
    push(cfg.saveImage !== false, { label: L('saveImage'), click: () => wc && wc.downloadURL(src) });
    push(cfg.openLinkNewTab !== false, { label: L('openImageNewTab'), click: () => actions.openTab(src, { activate: false }) });
    push(cfg.copyImage !== false, { label: L('copyImage'), click: () => wc && wc.copyImageAt(params.x, params.y) });
    push(cfg.copyImageAddress !== false, { label: L('copyImageAddress'), click: () => clipboard.writeText(src) });
    sep();
  }

  if (sel) {
    push(cfg.copy !== false, { label: L('copy'), role: 'copy', enabled: !!(params.editFlags && params.editFlags.canCopy) });
    push(cfg.searchSelection !== false, {
      label: L('searchFor', { engine: searchEngineName || 'web', q: trim(sel) }),
      click: () => actions.searchInNewTab(sel)
    });
    if (engines && engines.length) {
      items.push({
        label: L('searchWith'),
        submenu: engines.filter((e) => e.id !== settings.searchEngine).slice(0, 8).map((e) => ({
          label: e.name,
          click: () => actions.searchInNewTab(sel, e.id)
        }))
      });
    }
    push(cfg.translateSelection !== false, {
      label: L('translate'),
      click: () => actions.openTab('https://translate.google.com/?sl=auto&tl=' + (lang === 'fa' ? 'fa' : 'en') + '&text=' + encodeURIComponent(sel), { activate: true })
    });
    push(cfg.copyAsMarkdown !== false && !link, { label: L('copyMarkdown'), click: () => clipboard.writeText(sel) });
    sep();
  }

  if (params.isEditable) {
    push(cfg.copy !== false, { label: L('undo'), role: 'undo', enabled: !!(params.editFlags && params.editFlags.canUndo) });
    push(cfg.copy !== false, { label: L('redo'), role: 'redo', enabled: !!(params.editFlags && params.editFlags.canRedo) });
    sep();
    push(cfg.copy !== false, { label: L('cut'), role: 'cut', enabled: !!(params.editFlags && params.editFlags.canCut) });
    push(cfg.copy !== false, { label: L('copy'), role: 'copy', enabled: !!(params.editFlags && params.editFlags.canCopy) });
    push(cfg.paste !== false, { label: L('paste'), role: 'paste', enabled: !!(params.editFlags && params.editFlags.canPaste) });
    push(cfg.selectAll !== false, { label: L('selectAll'), role: 'selectAll' });
    sep();
  }

  if (params.misspelledWord) {
    for (const suggestion of (params.dictionarySuggestions || []).slice(0, 5)) {
      items.push({ label: suggestion, click: () => wc && wc.replaceMisspelling(suggestion) });
    }
    if (!items.length || items[items.length - 1].type === 'separator') {
      items.push({ label: L('noSpelling'), enabled: false });
    }
    items.push({
      label: L('addDictionary', { word: trim(params.misspelledWord, 24) }),
      click: () => wc && wc.session.addWordToSpellCheckerDictionary(params.misspelledWord)
    });
    sep();
  }

  push(cfg.back !== false, { label: L('back'), enabled: !!(tab && tab.canGoBack), click: () => actions.goBack() });
  push(cfg.forward !== false, { label: L('forward'), enabled: !!(tab && tab.canGoForward), click: () => actions.goForward() });
  push(cfg.reload !== false, { label: L('reload'), click: () => actions.reload() });
  sep();
  push(cfg.viewSource !== false, {
    label: L('viewSource'),
    enabled: !!(tab && /^https?:/.test(tab.url || '')),
    click: () => actions.openTab('view-source:' + tab.url, { activate: false })
  });
  push(cfg.savePage !== false, {
    label: L('savePage'),
    click: () => wc && wc.downloadURL(tab.url)
  });
  push(cfg.print !== false, { label: L('print'), click: () => wc && wc.print() });
  sep();
  push(cfg.inspect !== false, { label: L('inspectMg'), click: () => actions.openDevtoolsPanel() });
  push(cfg.inspectNative !== false, { label: L('inspectNative'), click: () => actions.openNativeDevtools() });

  if (cfg.customActions !== false && Array.isArray(settings.customContextActions) && settings.customContextActions.length) {
    sep();
    items.push({
      label: L('customActions'),
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

  sep();
  items.push({ label: L('customizeMenu'), click: () => actions.openContextSettings() });

  return Menu.buildFromTemplate(items.filter((i, idx) => i && (i.type === 'separator' ? idx > 0 : true)));
}

function buildTabMenu({ tab, settings, actions, lang = 'en' }) {
  const L = makeL(lang);
  return Menu.buildFromTemplate([
    { label: L('newTab'), click: () => actions.newTab() },
    { label: L('reload'), click: () => actions.reloadTab(tab.id) },
    { label: L('duplicate'), click: () => actions.duplicateTab(tab.id) },
    { type: 'separator' },
    { label: tab.pinned ? L('unpin') : L('pin'), click: () => actions.pinTab(tab.id, !tab.pinned) },
    { label: tab.muted ? L('unmute') : L('mute'), click: () => actions.muteTab(tab.id, !tab.muted) },
    { label: L('openSplit'), enabled: !!actions.canSplit, click: () => actions.splitWith(tab.id) },
    { type: 'separator' },
    { label: L('closeTab'), click: () => actions.closeTab(tab.id) },
    { label: L('closeOthers'), click: () => actions.closeOthers(tab.id) },
    { label: L('closeRight'), click: () => actions.closeRight(tab.id) },
    { type: 'separator' },
    { label: L('copyAddress'), click: () => clipboard.writeText(tab.url || '') }
  ]);
}

function buildProfileMenu({ profile, actions, lang = 'en' }) {
  const L = makeL(lang);
  const header = {
    label: profile && (profile.email || profile.name)
      ? `${profile.name || 'Google account'}\n${profile.email || ''}`
      : L('notSignedIn'),
    enabled: false
  };
  return Menu.buildFromTemplate([
    header,
    { type: 'separator' },
    { label: L('manageGoogle'), click: () => actions.openTab('https://myaccount.google.com/', { activate: true }) },
    { label: L('changePhoto'), click: () => actions.changeAvatar() },
    { label: L('removePhoto'), click: () => actions.clearAvatar() },
    { type: 'separator' },
    { label: L('passwords'), click: () => actions.openPasswords() },
    { label: L('settings'), click: () => actions.openSettings() }
  ]);
}

function buildMainMenu({ settings, actions, recentHistory, isBookmarked, lang = 'en' }) {
  const L = makeL(lang);
  const historyItems = (recentHistory || []).map((h) => ({
    label: trim(h.title || h.url, 60),
    click: () => actions.openTab(h.url, { activate: true })
  }));
  if (!historyItems.length) historyItems.push({ label: L('noHistory'), enabled: false });
  historyItems.push({ type: 'separator' }, { label: L('clearHistory'), click: () => actions.clearHistory() });

  return Menu.buildFromTemplate([
    { label: L('newTab'), accelerator: 'CmdOrCtrl+T', click: () => actions.newTab() },
    { label: L('newSplit'), accelerator: 'CmdOrCtrl+Shift+S', click: () => actions.newSplit() },
    { type: 'separator' },
    { label: isBookmarked ? L('removeBookmark') : L('bookmark'), accelerator: 'CmdOrCtrl+D', click: () => actions.toggleBookmark() },
    { label: L('history'), submenu: historyItems },
    { label: L('downloads'), accelerator: 'CmdOrCtrl+J', click: () => actions.openDownloads() },
    { label: L('passwords'), click: () => actions.openPasswords() },
    { type: 'separator' },
    {
      label: L('zoom'),
      submenu: [
        { label: L('zoomIn'), accelerator: 'CmdOrCtrl+Plus', click: () => actions.zoom(0.5) },
        { label: L('zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => actions.zoom(-0.5) },
        { label: L('resetZoom'), accelerator: 'CmdOrCtrl+0', click: () => actions.zoom(0) }
      ]
    },
    { label: L('find'), accelerator: 'CmdOrCtrl+F', click: () => actions.find() },
    { label: L('print'), accelerator: 'CmdOrCtrl+P', click: () => actions.print() },
    { type: 'separator' },
    { label: L('devtools'), accelerator: 'F12', click: () => actions.openDevtools() },
    { label: L('settings'), accelerator: 'CmdOrCtrl+,', click: () => actions.openSettings() },
    { type: 'separator' },
    { label: L('about'), click: () => actions.about() },
    { label: L('quit'), role: 'quit' }
  ]);
}

function trim(text, max = 40) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildPageMenuSpec({ params, tab, settings, actions, engines, searchEngineName, lang = 'en' }) {
  const L = makeL(lang);
  const cfg = settings.contextMenu || {};
  const wc = tab && tab.view ? tab.view.webContents : null;
  const link = params.linkURL;
  const media = params.mediaType;
  const sel = (params.selectionText || '').trim();
  const items = [];
  const map = new Map();
  let seq = 0;

  const add = (label, run, opts = {}) => {
    const id = 'cm' + (++seq);
    if (run) map.set(id, run);
    items.push({ id, type: 'item', label, enabled: opts.enabled !== false });
  };
  const sep = () => { if (items.length && items[items.length - 1].type !== 'separator') items.push({ type: 'separator' }); };

  if (link) {
    if (cfg.openLinkNewTab !== false) add(L('openLinkNewTab'), () => actions.openTab(link, { activate: false }));
    if (cfg.openLinkSplit !== false) add(L('openLinkSplit'), () => actions.openSplit(link));
    if (cfg.saveLink !== false) add(L('saveLink'), () => wc && wc.downloadURL(link));
    if (cfg.copyLink !== false) add(L('copyLink'), () => clipboard.writeText(link));
    if (cfg.copyLink !== false) add(L('copyLinkMarkdown'), () => clipboard.writeText(`[${params.linkText || link}](${link})`));
    sep();
  }

  if (media && (params.srcURL || media === 'image')) {
    const src = params.srcURL;
    if (cfg.saveImage !== false) add(L('saveImage'), () => wc && wc.downloadURL(src));
    if (cfg.openLinkNewTab !== false) add(L('openImageNewTab'), () => actions.openTab(src, { activate: false }));
    if (cfg.copyImage !== false) add(L('copyImage'), () => wc && wc.copyImageAt(params.x, params.y));
    if (cfg.copyImageAddress !== false) add(L('copyImageAddress'), () => clipboard.writeText(src));
    sep();
  }

  if (sel) {
    if (cfg.copy !== false) add(L('copy'), () => wc && wc.copy(), { enabled: !!(params.editFlags && params.editFlags.canCopy) });
    if (cfg.searchSelection !== false) add(L('searchFor', { engine: searchEngineName || 'web', q: trim(sel) }), () => actions.searchInNewTab(sel));
    if (cfg.translateSelection !== false) {
      add(L('translate'), () => actions.openTab(
        'https://translate.google.com/?sl=auto&tl=' + (lang === 'fa' ? 'fa' : 'en') + '&text=' + encodeURIComponent(sel),
        { activate: true }
      ));
    }
    if (cfg.copyAsMarkdown !== false && !link) add(L('copyMarkdown'), () => clipboard.writeText(sel));
    sep();
  }

  if (params.isEditable) {
    if (cfg.copy !== false) {
      add(L('undo'), () => wc && wc.undo(), { enabled: !!(params.editFlags && params.editFlags.canUndo) });
      add(L('redo'), () => wc && wc.redo(), { enabled: !!(params.editFlags && params.editFlags.canRedo) });
      sep();
      add(L('cut'), () => wc && wc.cut(), { enabled: !!(params.editFlags && params.editFlags.canCut) });
      add(L('copy'), () => wc && wc.copy(), { enabled: !!(params.editFlags && params.editFlags.canCopy) });
      add(L('paste'), () => wc && wc.paste(), { enabled: !!(params.editFlags && params.editFlags.canPaste) });
      add(L('selectAll'), () => wc && wc.selectAll());
      sep();
    }
  }

  if (params.misspelledWord) {
    const suggestions = (params.dictionarySuggestions || []).slice(0, 5);
    if (suggestions.length) {
      for (const suggestion of suggestions) {
        add(suggestion, () => wc && wc.replaceMisspelling(suggestion));
      }
    } else {
      add(L('noSpelling'), null, { enabled: false });
    }
    add(L('addDictionary', { word: trim(params.misspelledWord, 24) }), () => wc && wc.session.addWordToSpellCheckerDictionary(params.misspelledWord));
    sep();
  }

  if (cfg.openLinkNewTab !== false) add(L('copyAddress'), () => clipboard.writeText(tab ? tab.url : ''));
  if (cfg.back !== false) add(L('back'), () => actions.goBack(), { enabled: !!(tab && tab.canGoBack) });
  if (cfg.forward !== false) add(L('forward'), () => actions.goForward(), { enabled: !!(tab && tab.canGoForward) });
  if (cfg.reload !== false) add(L('reload'), () => actions.reload());
  sep();
  if (cfg.viewSource !== false) {
    add(L('viewSource'), () => actions.openTab('view-source:' + tab.url, { activate: false }), { enabled: !!(tab && /^https?:/.test(tab.url || '')) });
  }
  if (cfg.savePage !== false) add(L('savePage'), () => wc && wc.downloadURL(tab.url));
  if (cfg.print !== false) add(L('print'), () => wc && wc.print());
  sep();
  if (cfg.inspect !== false) add(L('inspectMg'), () => actions.openDevtoolsPanel());
  if (cfg.inspectNative !== false) add(L('inspectNative'), () => actions.openNativeDevtools());

  if (cfg.customActions !== false && Array.isArray(settings.customContextActions) && settings.customContextActions.length) {
    sep();
    for (const action of settings.customContextActions) {
      add(action.label || 'Action', () => {
        const target = sel || (tab && tab.url) || '';
        const url = String(action.urlTemplate || '').replace(/%s/g, encodeURIComponent(target));
        if (url) actions.openTab(url, { activate: true });
      });
    }
  }

  sep();
  add(L('customizeMenu'), () => actions.openContextSettings());

  return { items, actions: map };
}

module.exports = { buildPageMenu, buildPageMenuSpec, buildTabMenu, buildProfileMenu, buildMainMenu };
