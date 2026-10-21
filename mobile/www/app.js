'use strict';

(function () {
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ */
  /* i18n                                                               */
  /* ------------------------------------------------------------------ */

  const EN = {
    'nav.home': 'Home', 'nav.tabs': 'Tabs', 'nav.vault': 'Vault', 'nav.settings': 'Settings',
    'greeting.morning': 'Good morning', 'greeting.afternoon': 'Good afternoon', 'greeting.evening': 'Good evening',
    'home.subtitle': 'Where would you like to go?',
    'home.search': 'Search the web or enter an address',
    'home.searchWith': 'Search with {engine}',
    'settings.title': 'Settings',
    'home.why': 'Why MG',
    'feature.vault': 'Encrypted vault', 'feature.vaultSub': 'AES-256, only on your device',
    'feature.engines': '9 search engines', 'feature.enginesSub': 'Google to Perplexity, plus Wikipedia',
    'feature.privacy': 'Private by design', 'feature.privacySub': 'No account, no tracking, no clutter.',
    'home.quick': 'Quick links', 'home.recent': 'Recent', 'home.clear': 'Clear', 'home.customize': 'Customize',
    'tabs.title': 'Tabs', 'tabs.placeholder': 'Paste a link or search…', 'tabs.empty': 'No open tabs',
    'tabs.emptyHint': 'Search or paste a link to start browsing. Tabs are saved on this device.',
    'tabs.note': "Pages open in your device's secure browser. Your tab list stays in MG.",
    'tabs.open': 'Open', 'tabs.remove': 'Close tab',
    'vault.title': 'Password vault', 'vault.unlock': 'Unlock your vault',
    'vault.create': 'Create a master password',
    'vault.hint': 'Passwords are encrypted with AES-256 on this device. There is no recovery key.',
    'vault.createHint': 'Choose a master password. It never leaves this device and cannot be recovered.',
    'vault.master': 'Master password', 'vault.confirm': 'Confirm master password',
    'vault.unlockBtn': 'Unlock', 'vault.createBtn': 'Create vault',
    'vault.wrong': 'Wrong password. Try again.',
    'vault.search': 'Search vault…', 'vault.add': 'Add password',
    'vault.empty': 'Your vault is empty', 'vault.emptyHint': 'Save a password and it will be encrypted with your master password.',
    'vault.site': 'Website (example.com)', 'vault.username': 'Username or email', 'vault.password': 'Password',
    'vault.save': 'Save password', 'vault.cancel': 'Cancel', 'vault.generate': 'Generate',
    'vault.delete': 'Delete', 'vault.reveal': 'Reveal', 'vault.hide': 'Hide', 'vault.copy': 'Copy',
    'vault.saved': 'Password saved', 'vault.deleted': 'Password deleted', 'vault.locked': 'Vault locked',
    'vault.created': 'Vault created', 'vault.unlocked': 'Vault unlocked', 'vault.siteRequired': 'Website and password are required',
    'settings.appearance': 'Appearance', 'settings.light': 'Light', 'settings.dark': 'Dark', 'settings.system': 'System',
    'settings.accent': 'Accent color', 'settings.language': 'Language', 'settings.engine': 'Search engine',
    'settings.profile': 'Profile', 'settings.localProfile': 'Local profile', 'settings.tapPhoto': 'Tap to add a photo',
    'settings.choose': 'Choose', 'settings.data': 'Data', 'settings.closeTabs': 'Close all tabs',
    'settings.clearHistory': 'Clear recent history', 'settings.deleteVault': 'Delete password vault',
    'settings.about': 'About', 'settings.aboutDesc': 'A modern mobile browser shell with search, tabs and an encrypted vault.',
    'settings.install': 'Install MG Mobile', 'settings.installed': 'MG Mobile is installed',
    'settings.version': 'Mobile edition · v1.0.0',
    'common.add': 'Add', 'common.close': 'Close', 'common.delete': 'Delete', 'common.cancel': 'Cancel',
    'common.save': 'Save', 'common.open': 'Open', 'common.search': 'Search',
    'toast.copied': 'Copied', 'toast.tabAdded': 'Tab added', 'toast.tabClosed': 'Tab closed',
    'toast.tabsClosed': 'All tabs closed', 'toast.historyCleared': 'History cleared',
    'toast.vaultDeleted': 'Password vault deleted', 'toast.noClipboard': 'Clipboard unavailable',
    'confirm.clearTabs': 'Close all tabs?', 'confirm.clearHistory': 'Clear recent history?',
    'confirm.deleteVault': 'Delete the vault and every saved password? This cannot be undone.'
  };

  const FA = {
    'nav.home': 'خانه', 'nav.tabs': 'تب‌ها', 'nav.vault': 'گاوصندوق', 'nav.settings': 'تنظیمات',
    'greeting.morning': 'صبح بخیر', 'greeting.afternoon': 'ظهر بخیر', 'greeting.evening': 'عصر بخیر',
    'home.subtitle': 'کجا می‌خواهید بروید؟',
    'home.search': 'جستجو در وب یا وارد کردن نشانی',
    'home.searchWith': 'جستجو با {engine}',
    'settings.title': 'تنظیمات',
    'home.why': 'چرا MG',
    'feature.vault': 'گاوصندوق رمزنگاری‌شده', 'feature.vaultSub': 'AES-256، فقط روی دستگاه شما',
    'feature.engines': '۹ موتور جستجو', 'feature.enginesSub': 'از گوگل تا Perplexity و ویکی‌پدیا',
    'feature.privacy': 'خصوصی از پایه', 'feature.privacySub': 'بدون حساب، بدون ردیابی، بدون شلوغی.',
    'home.quick': 'دسترسی سریع', 'home.recent': 'اخیر', 'home.clear': 'پاک کردن', 'home.customize': 'شخصی‌سازی',
    'tabs.title': 'تب‌ها', 'tabs.placeholder': 'پیوندی بچسبانید یا جستجو کنید…', 'tabs.empty': 'تبی باز نیست',
    'tabs.emptyHint': 'جستجو کنید یا پیوندی بچسبانید. تب‌ها روی همین دستگاه ذخیره می‌شوند.',
    'tabs.note': 'صفحه‌ها در مرورگر امن دستگاه باز می‌شوند. فهرست تب‌ها در MG می‌ماند.',
    'tabs.open': 'باز کردن', 'tabs.remove': 'بستن تب',
    'vault.title': 'گاوصندوق رمزها', 'vault.unlock': 'گاوصندوق را باز کنید',
    'vault.create': 'یک رمز اصلی بسازید',
    'vault.hint': 'رمزها روی همین دستگاه با AES-256 رمزنگاری می‌شوند. کلید بازیابی وجود ندارد.',
    'vault.createHint': 'یک رمز اصلی انتخاب کنید. این رمز از دستگاه خارج نمی‌شود و قابل بازیابی نیست.',
    'vault.master': 'رمز اصلی', 'vault.confirm': 'تکرار رمز اصلی',
    'vault.unlockBtn': 'باز کردن', 'vault.createBtn': 'ساخت گاوصندوق',
    'vault.wrong': 'رمز اشتباه است. دوباره تلاش کنید.',
    'vault.search': 'جستجو در گاوصندوق…', 'vault.add': 'افزودن رمز',
    'vault.empty': 'گاوصندوق خالی است', 'vault.emptyHint': 'رمزی ذخیره کنید تا با رمز اصلی شما رمزنگاری شود.',
    'vault.site': 'وب‌سایت (example.com)', 'vault.username': 'نام کاربری یا ایمیل', 'vault.password': 'رمز عبور',
    'vault.save': 'ذخیره رمز', 'vault.cancel': 'انصراف', 'vault.generate': 'تولید',
    'vault.delete': 'حذف', 'vault.reveal': 'نمایش', 'vault.hide': 'پنهان', 'vault.copy': 'کپی',
    'vault.saved': 'رمز ذخیره شد', 'vault.deleted': 'رمز حذف شد', 'vault.locked': 'گاوصندوق قفل شد',
    'vault.created': 'گاوصندوق ساخته شد', 'vault.unlocked': 'گاوصندوق باز شد', 'vault.siteRequired': 'وب‌سایت و رمز لازم است',
    'settings.appearance': 'ظاهر', 'settings.light': 'روشن', 'settings.dark': 'تیره', 'settings.system': 'سیستم',
    'settings.accent': 'رنگ تأکیدی', 'settings.language': 'زبان', 'settings.engine': 'موتور جستجو',
    'settings.profile': 'پروفایل', 'settings.localProfile': 'پروفایل محلی', 'settings.tapPhoto': 'برای افزودن تصویر ضربه بزنید',
    'settings.choose': 'انتخاب', 'settings.data': 'داده‌ها', 'settings.closeTabs': 'بستن همه تب‌ها',
    'settings.clearHistory': 'پاک کردن تاریخچه اخیر', 'settings.deleteVault': 'حذف گاوصندوق رمزها',
    'settings.about': 'درباره', 'settings.aboutDesc': 'پوسته مدرن مرورگر موبایل با جستجو، تب‌ها و گاوصندوق رمزنگاری‌شده.',
    'settings.install': 'نصب MG Mobile', 'settings.installed': 'MG Mobile نصب شده است',
    'settings.version': 'نسخه موبایل · نسخه ۱.۰.۰',
    'common.add': 'افزودن', 'common.close': 'بستن', 'common.delete': 'حذف', 'common.cancel': 'انصراف',
    'common.save': 'ذخیره', 'common.open': 'باز کردن', 'common.search': 'جستجو',
    'toast.copied': 'کپی شد', 'toast.tabAdded': 'تب اضافه شد', 'toast.tabClosed': 'تب بسته شد',
    'toast.tabsClosed': 'همه تب‌ها بسته شدند', 'toast.historyCleared': 'تاریخچه پاک شد',
    'toast.vaultDeleted': 'گاوصندوق حذف شد', 'toast.noClipboard': 'کلیپ‌بورد در دسترس نیست',
    'confirm.clearTabs': 'همه تب‌ها بسته شوند؟', 'confirm.clearHistory': 'تاریخچه اخیر پاک شود؟',
    'confirm.deleteVault': 'گاوصندوق و همه رمزها حذف شوند؟ این کار قابل بازگشت نیست.'
  };

  let lang = 'en';
  const t = (key, vars) => {
    const dict = lang === 'fa' ? FA : EN;
    let value = dict[key] !== undefined ? dict[key] : (EN[key] || key);
    if (vars) for (const [k, v] of Object.entries(vars)) value = value.split('{' + k + '}').join(String(v));
    return value;
  };

  /* ------------------------------------------------------------------ */
  /* engines                                                            */
  /* ------------------------------------------------------------------ */

  const ENGINES = [
    { id: 'google', name: 'Google', glyph: 'G', color: '#4285f4', url: 'https://www.google.com/search?q={q}' },
    { id: 'bing', name: 'Bing', glyph: 'b', color: '#0aa1dd', url: 'https://www.bing.com/search?q={q}' },
    { id: 'duckduckgo', name: 'DuckDuckGo', glyph: 'D', color: '#de5833', url: 'https://duckduckgo.com/?q={q}' },
    { id: 'brave', name: 'Brave', glyph: 'B', color: '#fb542b', url: 'https://search.brave.com/search?q={q}' },
    { id: 'yahoo', name: 'Yahoo', glyph: 'y', color: '#7b0099', url: 'https://search.yahoo.com/search?p={q}' },
    { id: 'yandex', name: 'Yandex', glyph: 'Y', color: '#fc3f1d', url: 'https://yandex.com/search/?text={q}' },
    { id: 'startpage', name: 'Startpage', glyph: 'S', color: '#5a6b7b', url: 'https://www.startpage.com/sp/search?query={q}' },
    { id: 'wikipedia', name: 'Wikipedia', glyph: 'W', color: '#3b4453', url: 'https://{lang}.wikipedia.org/w/index.php?search={q}' },
    { id: 'perplexity', name: 'Perplexity', glyph: 'P', color: '#20b8cd', url: 'https://www.perplexity.ai/search?q={q}' }
  ];

  const engineById = (id) => ENGINES.find((e) => e.id === id) || ENGINES[0];

  function searchUrl(query, engineId) {
    const engine = engineById(engineId || state.engine);
    return engine.url
      .replace(/\{q\}/g, encodeURIComponent(query))
      .replace(/\{lang\}/g, state.lang);
  }

  function looksLikeUrl(value) {
    const s = String(value || '').trim();
    if (!s) return false;
    if (/^[a-z]+:\/\//i.test(s)) return true;
    if (/\s/.test(s)) return false;
    if (/^(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/i.test(s)) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}/.test(s)) return true;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d+)?([/?#].*)?$/i.test(s);
  }

  function normalizeUrl(value) {
    const s = String(value || '').trim();
    if (/^[a-z]+:\/\//i.test(s)) return s;
    return 'https://' + s;
  }

  /* ------------------------------------------------------------------ */
  /* storage + state                                                    */
  /* ------------------------------------------------------------------ */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('mg.mobile.' + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('mg.mobile.' + key, JSON.stringify(value)); } catch { /* ignore */ }
    },
    remove(key) {
      try { localStorage.removeItem('mg.mobile.' + key); } catch { /* ignore */ }
    }
  };

  const state = {
    view: 'home',
    theme: store.get('theme', 'system'),
    lang: store.get('lang', 'en'),
    accent: store.get('accent', '#7c5cff'),
    engine: store.get('engine', 'google'),
    tabs: store.get('tabs', []),
    history: store.get('history', []),
    profile: store.get('profile', { name: '', avatar: '' }),
    vault: store.get('vault', null),
    unlocked: false,
    key: null,
    entries: [],
    reveal: new Set(),
    vaultQuery: '',
    addPwOpen: false,
    suggestSeq: 0,
    suggestItems: [],
    enginePicker: false,
    deferredPrompt: null,
    toastTimer: null
  };

  lang = state.lang;

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function colorFor(text) {
    let hash = 0;
    const s = String(text || '');
    for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    const palette = ['#7c5cff', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];
    return palette[hash % palette.length];
  }

  function faviconFor(url) {
    const host = hostOf(url);
    if (!host) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  }

  function monogram(text) {
    const clean = String(text || '').trim();
    if (!clean) return 'MG';
    const parts = clean.split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : clean.slice(0, 2).toUpperCase();
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const rtf = new Intl.RelativeTimeFormat(lang === 'fa' ? 'fa-IR' : 'en', { numeric: 'auto' });
    const min = Math.round(diff / 60000);
    if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
    const hours = Math.round(min / 60);
    if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.round(hours / 24), 'day');
  }

  function toast(message, kind = 'success') {
    const host = $('toastHost');
    host.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `<svg class="icon"><use href="#i-${kind === 'error' ? 'close' : 'check'}"></use></svg><span>${esc(message)}</span>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 240);
    }, 2400);
  }

  /* ------------------------------------------------------------------ */
  /* theme / language                                                   */
  /* ------------------------------------------------------------------ */

  function effectiveTheme() {
    if (state.theme === 'light') return 'light';
    if (state.theme === 'dark') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme() {
    const theme = effectiveTheme();
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent', state.accent);
    const hex = String(state.accent).replace('#', '');
    const num = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
    if (!Number.isNaN(num)) {
      document.documentElement.style.setProperty('--accent-rgb', `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`);
    }
    document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0a0b10' : '#eef1f8');
  }

  function applyLanguage() {
    lang = state.lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? 'greeting.morning' : hour < 18 ? 'greeting.afternoon' : 'greeting.evening';
    $('greeting').textContent = t(greetingKey);
    $('homeSubtitle').textContent = t('home.subtitle');
    $('q').placeholder = t('home.search');
    $('engineHint').textContent = t('home.searchWith', { engine: engineById(state.engine).name });
    $('quickTitle').textContent = t('home.quick');
    $('featuresTitle').textContent = t('home.why');
    $('featureVault').textContent = t('feature.vault');
    $('featureVaultSub').textContent = t('feature.vaultSub');
    $('featureEngines').textContent = t('feature.engines');
    $('featureEnginesSub').textContent = t('feature.enginesSub');
    $('featurePrivacy').textContent = t('feature.privacy');
    $('featurePrivacySub').textContent = t('feature.privacySub');
    $('recentTitle').textContent = t('home.recent');
    $('clearRecent').textContent = t('home.clear');
    $('customizeBtn').textContent = t('home.customize');
    $('tabsTitle').textContent = t('tabs.title');
    $('tabUrl').placeholder = t('tabs.placeholder');
    $('vaultTitle').textContent = t('vault.title');
    $('settingsTitle').textContent = t('settings.title') || t('nav.settings');
    $('appearanceTitle').textContent = t('settings.appearance');
    $('accentLabel').textContent = t('settings.accent');
    $('languageTitle').textContent = t('settings.language');
    $('engineTitle').textContent = t('settings.engine');
    $('profileTitle').textContent = t('settings.profile');
    $('dataTitle').textContent = t('settings.data');
    $('aboutTitle').textContent = t('settings.about');
    $('aboutDesc').textContent = t('settings.aboutDesc');
    $('aboutSub').textContent = t('settings.version');
    $('unlockBtn').textContent = state.vault ? t('vault.unlockBtn') : t('vault.createBtn');
    $('lockTitle').textContent = state.vault ? t('vault.unlock') : t('vault.create');
    $('lockHint').textContent = state.vault ? t('vault.hint') : t('vault.createHint');
    $('masterPass').placeholder = t('vault.master');
    $('masterPass2').placeholder = t('vault.confirm');
    $('vaultSearch').placeholder = t('vault.search');
    $('pwSite').placeholder = t('vault.site');
    $('pwUser').placeholder = t('vault.username');
    $('pwPass').placeholder = t('vault.password');
    $('savePw').textContent = t('vault.save');
    $('cancelAddPw').textContent = t('vault.cancel');
    $('genPw').title = t('vault.generate');
    $('tabsNote').textContent = t('tabs.note');
    $('lockError').textContent = t('vault.wrong');
    $('emptyTabsTitle') && ($('emptyTabsTitle').textContent = t('tabs.empty'));
    $('pickAvatarLabel').textContent = t('settings.choose');
    $('clearTabsLabel').textContent = t('settings.closeTabs');
    $('clearHistoryLabel').textContent = t('settings.clearHistory');
    $('clearVaultLabel').textContent = t('settings.deleteVault');
    $('installBtn').textContent = state.deferredPrompt ? t('settings.install') : t('settings.installed');
    $('vaultEmpty').querySelector('.empty-title').textContent = t('vault.empty');
    $('vaultEmpty').querySelector('.empty-hint').textContent = t('vault.emptyHint');
    $('tabsEmpty').querySelector('.empty-title').textContent = t('tabs.empty');
    $('tabsEmpty').querySelector('.empty-hint').textContent = t('tabs.emptyHint');
    document.getElementById('tabsCount').textContent = String(state.tabs.length);
    document.querySelectorAll('.tabbar-item').forEach((btn) => {
      const label = btn.querySelector('span');
      if (label) label.textContent = t('nav.' + btn.dataset.nav);
    });
    renderThemeControls();
    renderQuickLinks();
    renderRecent();
    renderTabs();
    renderEngineCards();
    renderProfile();
    renderVault();
    if (state.view === 'home') $('greeting').textContent = t(greetingKey);
  }

  /* ------------------------------------------------------------------ */
  /* theme controls                                                     */
  /* ------------------------------------------------------------------ */

  function renderThemeControls() {
    document.querySelectorAll('#themeSeg button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === state.theme);
      const label = btn.querySelector('span');
      if (label) label.textContent = t('settings.' + btn.dataset.theme);
    });
    document.querySelectorAll('#langSeg button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === state.lang);
    });
    const swatches = $('swatches');
    const colors = ['#7c5cff', '#22d3ee', '#34d399', '#f472b6', '#f59e0b', '#ef4444', '#60a5fa', '#a78bfa'];
    swatches.innerHTML = colors.map((color) =>
      `<button class="swatch ${state.accent === color ? 'active' : ''}" data-accent="${color}" style="background:${color}" aria-label="${color}"></button>`
    ).join('');
  }

  /* ------------------------------------------------------------------ */
  /* home: quick links / recent                                         */
  /* ------------------------------------------------------------------ */

  const DEFAULT_SITES = [
    { host: 'wikipedia.org', url: 'https://www.wikipedia.org', letter: 'W', color: '#3b4453', label: 'Wikipedia' },
    { host: 'github.com', url: 'https://github.com', letter: 'G', color: '#24292f', label: 'GitHub' },
    { host: 'youtube.com', url: 'https://www.youtube.com', letter: 'Y', color: '#ff0033', label: 'YouTube' },
    { host: 'mail.google.com', url: 'https://mail.google.com', letter: 'M', color: '#ea4335', label: 'Gmail' },
    { host: 'reddit.com', url: 'https://www.reddit.com', letter: 'R', color: '#ff4500', label: 'Reddit' },
    { host: 'developer.mozilla.org', url: 'https://developer.mozilla.org', letter: 'M', color: '#1b1b1b', label: 'MDN' }
  ];

  function niceLabel(host) {
    const root = String(host || '').split('.').slice(-2).join('.');
    const map = { 'wikipedia.org': 'Wikipedia', 'github.com': 'GitHub', 'youtube.com': 'YouTube', 'google.com': 'Google', 'reddit.com': 'Reddit', 'mozilla.org': 'MDN' };
    return map[root] || host;
  }

  function topSites() {
    const map = new Map();
    for (const item of state.history) {
      const host = hostOf(item.url);
      if (!host) continue;
      const root = host.split('.').slice(-2).join('.');
      if (!map.has(root)) map.set(root, { host: root, url: new URL(item.url).origin, count: 0, favicon: item.favicon || '', label: niceLabel(root) });
      map.get(root).count += 1;
    }
    const historySites = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 4);
    const combined = [...historySites, ...DEFAULT_SITES];
    const seen = new Set();
    const result = [];
    for (const site of combined) {
      const root = String(site.host || hostOf(site.url)).split('.').slice(-2).join('.');
      if (!root || seen.has(root)) continue;
      seen.add(root);
      result.push(site);
      if (result.length >= 8) break;
    }
    return result;
  }

  function renderQuickLinks() {
    const grid = $('quickGrid');
    const sites = topSites();
    grid.innerHTML = sites.map((site) => {
      const host = (site.host || hostOf(site.url)).replace(/^www\./, '');
      const label = site.label || niceLabel(host) || host;
      const letter = (site.letter || host.charAt(0) || '?').toUpperCase();
      const color = site.color || colorFor(host);
      const favicon = site.favicon || faviconFor(site.url);
      return `<a class="quick" href="${esc(site.url)}" data-url="${esc(site.url)}" title="${esc(host)}">
        <span class="favicon" style="--fav-color:${esc(color)}" data-letter="${esc(letter)}">
          <img src="${esc(favicon)}" alt="">
        </span>
        <span>${esc(label)}</span>
      </a>`;
    }).join('');
    grid.querySelectorAll('.favicon img').forEach((img) => {
      img.addEventListener('error', () => {
        const host = img.parentElement;
        img.remove();
        host.textContent = host.dataset.letter || '?';
      });
    });
  }

  function renderRecent() {
    const list = $('recentList');
    const items = state.history.slice(0, 6);
    $('recentHead').classList.toggle('hidden', !items.length);
    list.innerHTML = items.map((item) => {
      const host = hostOf(item.url);
      const favicon = item.favicon || faviconFor(item.url);
      return `<div class="list-item" data-url="${esc(item.url)}">
        <span class="favicon" style="--fav-color:${colorFor(host)}" data-letter="${esc((host || '?').charAt(0).toUpperCase())}">
          <img src="${esc(favicon)}" alt="">
        </span>
        <span class="item-main"><span class="item-title">${esc(item.title || host || item.url)}</span>
          <span class="item-sub">${esc(host)}</span></span>
        <span class="item-actions"><button class="mini-btn" data-open="${esc(item.url)}"><svg class="icon"><use href="#i-external"></use></svg></button></span>
      </div>`;
    }).join('');
    list.querySelectorAll('.favicon img').forEach((img) => {
      img.addEventListener('error', () => {
        const host = img.parentElement;
        img.remove();
        host.textContent = host.dataset.letter || '?';
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* tabs                                                               */
  /* ------------------------------------------------------------------ */

  function persistTabs() {
    store.set('tabs', state.tabs.slice(0, 60));
    $('tabsCount').textContent = String(state.tabs.length);
    const badge = $('tabsBadge');
    badge.textContent = String(state.tabs.length);
    badge.classList.toggle('hidden', state.tabs.length === 0);
  }

  function renderTabs() {
    const list = $('tabsList');
    const tabs = state.tabs;
    $('tabsEmpty').classList.toggle('hidden', tabs.length > 0);
    list.innerHTML = tabs.map((tab) => {
      const host = hostOf(tab.url);
      const favicon = tab.favicon || faviconFor(tab.url);
      return `<div class="list-item" data-tab-id="${tab.id}">
        <span class="favicon" style="--fav-color:${colorFor(host)}" data-letter="${esc((host || '?').charAt(0).toUpperCase())}">
          <img src="${esc(favicon)}" alt="">
        </span>
        <span class="item-main" data-open-url="${esc(tab.url)}">
          <span class="item-title">${esc(tab.title || host || tab.url)}</span>
          <span class="item-sub">${esc(host)} · ${esc(timeAgo(tab.openedAt))}</span>
        </span>
        <span class="item-actions">
          <button class="mini-btn" data-tab-open="${tab.id}" title="${esc(t('common.open'))}"><svg class="icon"><use href="#i-external"></use></svg></button>
          <button class="mini-btn danger" data-tab-close="${tab.id}" title="${esc(t('tabs.remove'))}"><svg class="icon"><use href="#i-close"></use></svg></button>
        </span>
      </div>`;
    }).join('');
    list.querySelectorAll('.favicon img').forEach((img) => {
      img.addEventListener('error', () => {
        const host = img.parentElement;
        img.remove();
        host.textContent = host.dataset.letter || '?';
      });
    });
    persistTabs();
  }

  function addTab(url, title) {
    const host = hostOf(url);
    const tab = {
      id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url,
      title: title || host || url,
      favicon: faviconFor(url),
      openedAt: Date.now()
    };
    state.tabs = [tab, ...state.tabs.filter((x) => x.url !== url)].slice(0, 60);
    persistTabs();
    renderTabs();
    addHistory(url, tab.title);
    return tab;
  }

  function addHistory(url, title) {
    const host = hostOf(url);
    state.history = [{ url, title: title || host || url, favicon: faviconFor(url), visitedAt: Date.now() }, ...state.history.filter((h) => h.url !== url)].slice(0, 80);
    store.set('history', state.history);
    renderRecent();
    renderQuickLinks();
  }

  function removeTab(id) {
    state.tabs = state.tabs.filter((tab) => tab.id !== id);
    persistTabs();
    renderTabs();
    toast(t('toast.tabClosed'));
  }

  async function openUrl(url) {
    const target = looksLikeUrl(url) ? normalizeUrl(url) : searchUrl(url);
    addTab(target);
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
        await window.Capacitor.Plugins.Browser.open({ url: target });
        return;
      }
    } catch { /* fall through */ }
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  /* ------------------------------------------------------------------ */
  /* mobile search suggestions                                          */
  /* ------------------------------------------------------------------ */

  let suggestTimer = null;

  function wikiApi(query) {
    return `https://${state.lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&namespace=0&format=json&origin=*`;
  }

  function wikiSummary(query) {
    return `https://${state.lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}` +
      '&gsrlimit=1&prop=extracts|pageimages|info&inprop=url&exintro=1&explaintext=1&pithumbsize=160&format=json&origin=*';
  }

  async function fetchJson(url, timeout = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; } finally { clearTimeout(timer); }
  }

  async function loadSuggestions(raw) {
    const query = String(raw || '').trim();
    if (!query) { closeSuggest(); return; }
    const seq = ++state.suggestSeq;
    let suggestions = [];
    let card = null;
    try {
      const [open, summary] = await Promise.all([
        fetchJson(wikiApi(query)),
        fetchJson(wikiSummary(query))
      ]);
      if (seq !== state.suggestSeq) return;
      if (Array.isArray(open) && Array.isArray(open[1])) suggestions = open[1];
      if (summary && summary.query && summary.query.pages) {
        const page = Object.values(summary.query.pages)[0];
        if (page && page.extract) {
          card = {
            title: page.title,
            text: page.extract.replace(/\s+/g, ' ').slice(0, 300),
            url: page.fullurl,
            thumb: page.thumbnail ? page.thumbnail.source : ''
          };
        }
      }
    } catch { /* ignore */ }

    if (!card) {
      try {
        const ddg = await fetchJson('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1', 3200);
        if (ddg && ddg.AbstractText) {
          card = { title: ddg.Heading || query, text: ddg.AbstractText, url: ddg.AbstractURL, thumb: '' };
        }
      } catch { /* ignore */ }
    }
    if (seq !== state.suggestSeq) return;
    const local = state.history.filter((h) => h.url.toLowerCase().includes(query.toLowerCase()) || (h.title || '').toLowerCase().includes(query.toLowerCase())).slice(0, 2).map((h) => h.title);
    const merged = [...new Set([...suggestions, ...local])].slice(0, 6);
    renderSuggest(query, merged, card);
  }

  function renderSuggest(query, suggestions, card) {
    state.suggestItems = suggestions;
    const panel = $('suggestPanel');
    let html = '';
    if (card) {
      html += `<div class="answer" data-url="${esc(card.url || '')}" data-query="${esc(query)}">
        <div class="answer-thumb">${card.thumb ? `<img src="${esc(card.thumb)}" alt="">` : '💡'}</div>
        <div style="flex:1;min-width:0">
          <div class="answer-kicker">Wikipedia · ${esc(t('common.search'))}</div>
          <div class="answer-title">${esc(card.title)}</div>
          <div class="answer-text">${esc(card.text)}</div>
        </div></div>`;
    }
    if (suggestions.length) {
      html += suggestions.map((s) => `<div class="suggestion" data-query="${esc(s)}">
        <svg class="icon" style="width:15px;height:15px;opacity:.55"><use href="#i-search"></use></svg>
        <span>${esc(s)}</span><span class="src">${esc(engineById(state.engine).name)}</span>
      </div>`).join('');
    }
    if (!html) {
      html = `<div class="suggestion" data-query="${esc(query)}"><svg class="icon" style="width:15px;height:15px;opacity:.55"><use href="#i-search"></use></svg>
        <span>${esc(t('common.search'))} “${esc(query)}”</span><span class="src">${esc(engineById(state.engine).name)}</span></div>`;
    }
    panel.innerHTML = html;
    panel.classList.remove('hidden');
  }

  function renderEnginePicker() {
    const panel = $('suggestPanel');
    panel.innerHTML = `<div class="engine-grid">${ENGINES.map((e) => `
      <div class="engine-option ${e.id === state.engine ? 'active' : ''}" data-engine="${e.id}">
        <span class="engine-glyph" style="--engine-color:${e.color}">${e.glyph}</span>
        <span>${esc(e.name)}</span>
      </div>`).join('')}</div>`;
    panel.classList.remove('hidden');
    state.enginePicker = true;
  }

  function closeSuggest() {
    $('suggestPanel').classList.add('hidden');
    $('suggestPanel').innerHTML = '';
    state.enginePicker = false;
    state.suggestItems = [];
  }

  /* ------------------------------------------------------------------ */
  /* vault (AES-256-GCM + PBKDF2)                                       */
  /* ------------------------------------------------------------------ */

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

  async function deriveKey(password, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 180000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptJson(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), data: b64(data) };
  }

  async function decryptJson(key, blob) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.data));
    return JSON.parse(dec.decode(plain));
  }

  async function createVault(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const verifier = await encryptJson(key, 'mg-vault-ok');
    state.vault = { salt: b64(salt), verifier, entries: [] };
    store.set('vault', state.vault);
    state.key = key;
    state.entries = [];
    state.unlocked = true;
    afterVaultUnlock();
    toast(t('vault.created'));
  }

  async function unlockVault(password) {
    try {
      const salt = unb64(state.vault.salt);
      const key = await deriveKey(password, salt);
      const check = await decryptJson(key, state.vault.verifier);
      if (check !== 'mg-vault-ok') throw new Error('bad');
      const entries = [];
      for (const entry of state.vault.entries) {
        try {
          const data = await decryptJson(key, entry.blob);
          entries.push({ id: entry.id, ...data });
        } catch { /* skip broken entry */ }
      }
      state.key = key;
      state.entries = entries;
      state.unlocked = true;
      $('lockError').classList.add('hidden');
      afterVaultUnlock();
      toast(t('vault.unlocked'));
    } catch {
      $('lockError').classList.remove('hidden');
      state.unlocked = false;
      state.key = null;
    }
  }

  function afterVaultUnlock() {
    $('vaultLocked').classList.add('hidden');
    $('vaultUnlocked').classList.remove('hidden');
    $('masterPass').value = '';
    renderVault();
  }

  function lockVault() {
    state.unlocked = false;
    state.key = null;
    state.entries = [];
    state.reveal.clear();
    $('vaultUnlocked').classList.add('hidden');
    $('vaultLocked').classList.remove('hidden');
    $('lockError').classList.add('hidden');
    $('masterPass').value = '';
    $('masterPass2').value = '';
    $('masterPass2').classList.add('hidden');
    toast(t('vault.locked'), 'info');
  }

  async function saveEntry() {
    const site = $('pwSite').value.trim();
    const username = $('pwUser').value.trim();
    const password = $('pwPass').value;
    if (!site || !password) { toast(t('vault.siteRequired'), 'error'); return; }
    const data = { site, username, password, updatedAt: Date.now() };
    const blob = await encryptJson(state.key, data);
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    state.vault.entries.push({ id, blob });
    store.set('vault', state.vault);
    state.entries.push({ id, ...data });
    $('pwSite').value = '';
    $('pwUser').value = '';
    $('pwPass').value = '';
    $('addPwForm').classList.add('hidden');
    state.addPwOpen = false;
    renderVault();
    toast(t('vault.saved'));
  }

  async function deleteEntry(id) {
    if (!confirm(t('vault.delete') + '?')) return;
    state.vault.entries = state.vault.entries.filter((e) => e.id !== id);
    state.entries = state.entries.filter((e) => e.id !== id);
    store.set('vault', state.vault);
    renderVault();
    toast(t('vault.deleted'));
  }

  function renderVault() {
    $('vaultCount').textContent = String(state.entries.length);
    if (!state.unlocked) return;
    const query = state.vaultQuery.toLowerCase();
    const entries = state.entries.filter((e) =>
      !query || (e.site || '').toLowerCase().includes(query) || (e.username || '').toLowerCase().includes(query)
    );
    $('vaultEmpty').classList.toggle('hidden', entries.length > 0);
    $('vaultList').innerHTML = entries.map((entry) => {
      const host = hostOf(/^https?:\/\//.test(entry.site) ? entry.site : 'https://' + entry.site) || entry.site;
      const revealed = state.reveal.has(entry.id);
      return `<div class="list-item" data-entry="${entry.id}">
        <span class="favicon" style="--fav-color:${colorFor(host)}">${esc((host || '?').charAt(0).toUpperCase())}</span>
        <span class="item-main">
          <span class="item-title">${esc(host || entry.site)}</span>
          <span class="item-sub">${esc(entry.username || '—')} · <span class="pw-mask">${revealed ? esc(entry.password) : '••••••••'}</span></span>
        </span>
        <span class="item-actions">
          <button class="mini-btn" data-pw-copy="${entry.id}" title="${esc(t('vault.copy'))}"><svg class="icon"><use href="#i-copy"></use></svg></button>
          <button class="mini-btn" data-pw-reveal="${entry.id}" title="${esc(revealed ? t('vault.hide') : t('vault.reveal'))}"><svg class="icon"><use href="#i-${revealed ? 'eye-off' : 'eye'}"></use></svg></button>
          <button class="mini-btn danger" data-pw-delete="${entry.id}" title="${esc(t('vault.delete'))}"><svg class="icon"><use href="#i-trash"></use></svg></button>
        </span>
      </div>`;
    }).join('');
  }

  function generatePassword(length = 20) {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%^&*()-_=+[]{}?';
    const pool = lower + upper + digits + symbols;
    const bytes = crypto.getRandomValues(new Uint32Array(length));
    let out = '';
    for (let i = 0; i < length; i += 1) out += pool[bytes[i] % pool.length];
    return out;
  }

  function strengthLevel(value) {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 14) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
    return Math.max(1, Math.min(4, score));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('toast.copied'));
      return;
    } catch { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(t('toast.copied'));
    } catch {
      toast(t('toast.noClipboard'), 'error');
    }
  }

  /* ------------------------------------------------------------------ */
  /* settings render                                                    */
  /* ------------------------------------------------------------------ */

  function renderEngineCards() {
    $('engineCards').innerHTML = ENGINES.map((engine) => `
      <button class="engine-card ${state.engine === engine.id ? 'active' : ''}" data-engine="${engine.id}">
        <span class="engine-glyph" style="--engine-color:${engine.color}">${engine.glyph}</span>
        <span class="name">${esc(engine.name)}</span>
        ${state.engine === engine.id ? '<svg class="icon check"><use href="#i-check"></use></svg>' : ''}
      </button>`).join('');
  }

  function renderProfile() {
    const avatar = $('avatar');
    const profileAvatar = $('profileAvatar');
    const hasPhoto = !!state.profile.avatar;
    const image = hasPhoto ? `<img src="${esc(state.profile.avatar)}" alt="">` : esc(monogram(state.profile.name));
    avatar.innerHTML = image;
    profileAvatar.innerHTML = image;
    $('profileName').textContent = state.profile.name || t('settings.localProfile');
    $('profileSub').textContent = state.profile.name ? t('settings.profile') : t('settings.tapPhoto');
    $('pickAvatarLabel').textContent = t('settings.choose');
  }

  /* ------------------------------------------------------------------ */
  /* navigation                                                         */
  /* ------------------------------------------------------------------ */

  function switchView(view) {
    state.view = view;
    document.querySelectorAll('.view').forEach((section) => {
      section.classList.toggle('active', section.dataset.view === view);
    });
    document.querySelectorAll('.tabbar-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.nav === view);
    });
    if (view === 'home') {
      $('greeting').textContent = t(new Date().getHours() < 12 ? 'greeting.morning' : new Date().getHours() < 18 ? 'greeting.afternoon' : 'greeting.evening');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ------------------------------------------------------------------ */
  /* events                                                             */
  /* ------------------------------------------------------------------ */

  function bind() {
    document.querySelectorAll('.tabbar-item').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.dataset.nav));
    });

    $('searchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = $('q').value.trim();
      if (!value) return;
      closeSuggest();
      openUrl(value);
    });

    $('q').addEventListener('input', () => {
      const value = $('q').value;
      clearTimeout(suggestTimer);
      state.enginePicker = false;
      suggestTimer = setTimeout(() => loadSuggestions(value), 160);
    });

    $('q').addEventListener('focus', () => {
      if ($('q').value.trim()) loadSuggestions($('q').value);
    });

    $('engineBtn').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.enginePicker) closeSuggest();
      else renderEnginePicker();
    });

    $('suggestPanel').addEventListener('click', (event) => {
      const engine = event.target.closest('[data-engine]');
      if (engine) {
        state.engine = engine.dataset.engine;
        store.set('engine', state.engine);
        renderEngineCards();
        $('engineGlyph').textContent = engineById(state.engine).glyph;
        $('engineGlyph').style.setProperty('--engine-color', engineById(state.engine).color);
        $('engineHint').textContent = t('home.searchWith', { engine: engineById(state.engine).name });
        closeSuggest();
        return;
      }
      const item = event.target.closest('[data-query]');
      if (item) {
        const query = item.dataset.query || $('q').value;
        const url = item.dataset.url;
        closeSuggest();
        if (url) openUrl(url);
        else {
          $('q').value = query;
          openUrl(query);
        }
      }
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('.search-wrap')) return;
      if (!event.target.closest('#suggestPanel')) closeSuggest();
    });

    $('quickGrid').addEventListener('click', (event) => {
      const link = event.target.closest('[data-url]');
      if (!link) return;
      event.preventDefault();
      openUrl(link.dataset.url);
    });

    $('recentList').addEventListener('click', (event) => {
      const open = event.target.closest('[data-open]');
      if (open) { openUrl(open.dataset.open); return; }
      const row = event.target.closest('[data-url]');
      if (row) openUrl(row.dataset.url);
    });

    $('clearRecent').addEventListener('click', () => {
      if (!confirm(t('confirm.clearHistory'))) return;
      state.history = [];
      store.set('history', []);
      renderRecent();
      renderQuickLinks();
      toast(t('toast.historyCleared'));
    });

    $('customizeBtn').addEventListener('click', () => switchView('settings'));

    document.querySelectorAll('[data-feature]').forEach((card) => {
      card.addEventListener('click', () => {
        if (card.dataset.feature === 'vault') switchView('vault');
        else if (card.dataset.feature === 'engines') {
          switchView('settings');
          setTimeout(() => $('engineCards').scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
        } else {
          toast(t('feature.privacySub'), 'info');
        }
      });
    });

    $('tabForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = $('tabUrl').value.trim();
      if (!value) return;
      $('tabUrl').value = '';
      openUrl(value);
      toast(t('toast.tabAdded'));
    });

    $('tabsList').addEventListener('click', (event) => {
      const close = event.target.closest('[data-tab-close]');
      if (close) { removeTab(close.dataset.tabClose); return; }
      const open = event.target.closest('[data-tab-open]');
      if (open) {
        const tab = state.tabs.find((x) => x.id === open.dataset.tabOpen);
        if (tab) openUrl(tab.url);
        return;
      }
      const main = event.target.closest('[data-open-url]');
      if (main) openUrl(main.dataset.openUrl);
    });

    $('unlockBtn').addEventListener('click', async () => {
      const password = $('masterPass').value;
      if (!password) return;
      if (!state.vault) {
        if (password.length < 6) { $('lockError').textContent = 'Use at least 6 characters'; $('lockError').classList.remove('hidden'); return; }
        if ($('masterPass2').classList.contains('hidden')) {
          $('masterPass2').classList.remove('hidden');
          $('masterPass2').focus();
          return;
        }
        if (password !== $('masterPass2').value) {
          $('lockError').textContent = 'Passwords do not match';
          $('lockError').classList.remove('hidden');
          return;
        }
        await createVault(password);
      } else {
        await unlockVault(password);
      }
    });

    $('lockBtn').addEventListener('click', lockVault);
    $('addPwBtn').addEventListener('click', () => {
      state.addPwOpen = !state.addPwOpen;
      $('addPwForm').classList.toggle('hidden', !state.addPwOpen);
      if (state.addPwOpen) setTimeout(() => $('pwSite').focus(), 50);
    });
    $('cancelAddPw').addEventListener('click', () => {
      state.addPwOpen = false;
      $('addPwForm').classList.add('hidden');
    });
    $('savePw').addEventListener('click', saveEntry);
    $('genPw').addEventListener('click', () => {
      $('pwPass').value = generatePassword(20);
      $('pwStrength').dataset.level = String(strengthLevel($('pwPass').value));
    });
    $('pwPass').addEventListener('input', () => {
      $('pwStrength').dataset.level = String(strengthLevel($('pwPass').value));
    });
    $('vaultSearch').addEventListener('input', (event) => {
      state.vaultQuery = event.target.value;
      renderVault();
    });
    $('vaultList').addEventListener('click', (event) => {
      const copy = event.target.closest('[data-pw-copy]');
      if (copy) {
        const entry = state.entries.find((e) => e.id === copy.dataset.pwCopy);
        if (entry) copyText(entry.password);
        return;
      }
      const reveal = event.target.closest('[data-pw-reveal]');
      if (reveal) {
        const id = reveal.dataset.pwReveal;
        if (state.reveal.has(id)) state.reveal.delete(id);
        else state.reveal.add(id);
        renderVault();
        return;
      }
      const del = event.target.closest('[data-pw-delete]');
      if (del) deleteEntry(del.dataset.pwDelete);
    });

    document.querySelectorAll('#themeSeg button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        store.set('theme', state.theme);
        applyTheme();
        renderThemeControls();
      });
    });
    document.querySelectorAll('#langSeg button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.lang = btn.dataset.lang;
        store.set('lang', state.lang);
        applyLanguage();
      });
    });
    $('swatches').addEventListener('click', (event) => {
      const swatch = event.target.closest('[data-accent]');
      if (!swatch) return;
      state.accent = swatch.dataset.accent;
      store.set('accent', state.accent);
      applyTheme();
      renderThemeControls();
    });
    $('engineCards').addEventListener('click', (event) => {
      const card = event.target.closest('[data-engine]');
      if (!card) return;
      state.engine = card.dataset.engine;
      store.set('engine', state.engine);
      renderEngineCards();
      $('engineGlyph').textContent = engineById(state.engine).glyph;
      $('engineGlyph').style.setProperty('--engine-color', engineById(state.engine).color);
      $('engineHint').textContent = t('home.searchWith', { engine: engineById(state.engine).name });
    });

    $('pickAvatar').addEventListener('click', () => $('avatarInput').click());
    $('avatarBtn').addEventListener('click', () => {
      switchView('settings');
    });
    $('avatarInput').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 160;
          const ctx = canvas.getContext('2d');
          const size = Math.min(image.width, image.height);
          ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 160, 160);
          state.profile.avatar = canvas.toDataURL('image/jpeg', 0.82);
          store.set('profile', state.profile);
          renderProfile();
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    });

    $('clearTabsBtn').addEventListener('click', () => {
      if (!confirm(t('confirm.clearTabs'))) return;
      state.tabs = [];
      persistTabs();
      renderTabs();
      toast(t('toast.tabsClosed'));
    });
    $('clearHistoryBtn').addEventListener('click', () => {
      if (!confirm(t('confirm.clearHistory'))) return;
      state.history = [];
      store.set('history', []);
      renderRecent();
      renderQuickLinks();
      toast(t('toast.historyCleared'));
    });
    $('clearVaultBtn').addEventListener('click', () => {
      if (!confirm(t('confirm.deleteVault'))) return;
      store.remove('vault');
      state.vault = null;
      state.unlocked = false;
      state.entries = [];
      state.key = null;
      $('vaultUnlocked').classList.add('hidden');
      $('vaultLocked').classList.remove('hidden');
      $('masterPass2').classList.add('hidden');
      toast(t('toast.vaultDeleted'));
      applyLanguage();
    });

    $('installBtn').addEventListener('click', async () => {
      if (state.deferredPrompt) {
        state.deferredPrompt.prompt();
        await state.deferredPrompt.userChoice;
        state.deferredPrompt = null;
        return;
      }
      toast('Use your browser menu → “Add to Home Screen”', 'info');
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.theme === 'system') applyTheme();
    });

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
      $('installBtn').textContent = t('settings.install');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSuggest();
    });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                               */
  /* ------------------------------------------------------------------ */

  function boot() {
    if (!state.vault) {
      $('masterPass2').classList.add('hidden');
    }
    applyTheme();
    $('engineGlyph').textContent = engineById(state.engine).glyph;
    $('engineGlyph').style.setProperty('--engine-color', engineById(state.engine).color);
    applyLanguage();
    bind();
    switchView('home');

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();

