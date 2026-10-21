'use strict';

const { net } = require('electron');

/**
 * Search engines available in the omnibox.
 * {q} -> query, {lang} -> two letter language code.
 */
const BASE_ENGINES = [
  {
    id: 'google',
    name: 'Google',
    color: '#4285f4',
    glyph: 'G',
    url: 'https://www.google.com/search?q={q}&hl={lang}',
    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&hl={lang}&q={q}'
  },
  {
    id: 'bing',
    name: 'Bing',
    color: '#0aa1dd',
    glyph: 'b',
    url: 'https://www.bing.com/search?q={q}',
    suggest: 'https://api.bing.com/osjson.aspx?query={q}&language={lang}'
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    color: '#de5833',
    glyph: 'D',
    url: 'https://duckduckgo.com/?q={q}&ia=web',
    suggest: 'https://duckduckgo.com/ac/?q={q}&type=list'
  },
  {
    id: 'brave',
    name: 'Brave',
    color: '#fb542b',
    glyph: 'B',
    url: 'https://search.brave.com/search?q={q}',
    suggest: 'https://search.brave.com/api/suggest?q={q}&source=web'
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    color: '#7b0099',
    glyph: 'y',
    url: 'https://search.yahoo.com/search?p={q}',
    suggest: 'https://search.yahoo.com/sugg/os?command={q}&output=fxjson'
  },
  {
    id: 'yandex',
    name: 'Yandex',
    color: '#fc3f1d',
    glyph: 'Y',
    url: 'https://yandex.com/search/?text={q}',
    suggest: 'https://suggest.yandex.com/suggest-ff.cgi?part={q}'
  },
  {
    id: 'startpage',
    name: 'Startpage',
    color: '#5a6b7b',
    glyph: 'S',
    url: 'https://www.startpage.com/sp/search?query={q}',
    suggest: 'https://www.startpage.com/suggestions?q={q}&format=json'
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    color: '#3b4453',
    glyph: 'W',
    url: 'https://{lang}.wikipedia.org/w/index.php?search={q}',
    suggest: 'https://{lang}.wikipedia.org/w/api.php?action=opensearch&search={q}&limit=8&namespace=0&format=json'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    color: '#20b8cd',
    glyph: 'P',
    url: 'https://www.perplexity.ai/search?q={q}',
    suggest: null
  }
];

const ENGINE_BY_ID = new Map(BASE_ENGINES.map((e) => [e.id, e]));

function langOf(settings) {
  return settings && settings.language === 'fa' ? 'fa' : 'en';
}

function fill(template, query, lang) {
  return template
    .replace(/\{q\}/g, encodeURIComponent(query))
    .replace(/\{lang\}/g, lang)
    .replace(/%s/g, encodeURIComponent(query));
}

function enginesFor(settings) {
  const lang = langOf(settings);
  const custom = (settings.customSearchEngines || [])
    .filter((e) => e && e.url)
    .map((e, i) => ({
      id: e.id || 'custom-' + i,
      name: e.name || 'Custom',
      color: e.color || '#7c5cff',
      glyph: (e.name || 'C').trim().charAt(0).toUpperCase(),
      url: e.url,
      custom: true,
      suggest: null
    }));
  return [...BASE_ENGINES, ...custom].map((e) => ({
    ...e,
    searchUrl: fill(e.url, '__MG_QUERY__', lang).replace('__MG_QUERY__', '{q}')
  }));
}

function engineFor(settings, id) {
  const list = enginesFor(settings);
  return list.find((e) => e.id === (id || settings.searchEngine)) || list[0];
}

function buildSearchUrl(settings, query, engineId) {
  const engine = engineFor(settings, engineId);
  return fill(engine.url, query, langOf(settings));
}

function looksLikeUrl(input) {
  const s = String(input || '').trim();
  if (!s) return false;
  if (/^(https?|file|ftp|mailto|about|chrome|edge|view-source):/i.test(s)) return true;
  if (/^mg:\/\//i.test(s)) return true;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?([/?#]|$)/i.test(s)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?([/?#]|$)/.test(s)) return true;
  if (/\s/.test(s)) return false;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d+)?([/?#].*)?$/i.test(s)) return true;
  return false;
}

function normalizeUrl(input) {
  let s = String(input || '').trim();
  if (/^mg:\/\//i.test(s)) return s;
  if (/^[a-z]+:\/\//i.test(s)) return s;
  if (/^mailto:/i.test(s)) return s;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?([/?#]|$)/i.test(s)) return 'http://' + s;
  if (/^\d{1,3}(\.\d{1,3}){3}/.test(s)) return 'http://' + s;
  return 'https://' + s;
}

/* ------------------------------------------------------------------ */
/* network helpers                                                     */
/* ------------------------------------------------------------------ */

async function fetchJSON(url, timeout = 2600) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await net.fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*',
        'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8'
      }
    });
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseSuggestions(raw) {
  if (!raw) return [];
  let arr = raw;
  if (!Array.isArray(arr) && Array.isArray(arr.results)) arr = arr.results;
  if (!Array.isArray(arr) && Array.isArray(arr.suggestions)) arr = arr.suggestions;
  if (!Array.isArray(arr)) return [];
  if (arr.length > 1 && Array.isArray(arr[1])) arr = arr[1];
  return arr
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      return item.phrase || item.query || item.text || item.value || item.name || '';
    })
    .filter((s) => typeof s === 'string' && s.trim())
    .map((s) => s.trim());
}

/* ------------------------------------------------------------------ */
/* tiny math evaluator (for instant calculator answers)                */
/* ------------------------------------------------------------------ */

function tryMath(input) {
  let s = String(input || '').trim();
  if (s.length < 3) return null;
  if (!/^[0-9\s+\-*/^%().,]+$/.test(s)) return null;
  if (!/[+\-*/^%]/.test(s)) return null;
  s = s.replace(/,/g, '.').replace(/\s+/g, '');
  if (/[+\-*/^%]{2}/.test(s.replace(/[+\-](\d)/g, '$1'))) return null;

  const tokens = s.match(/(\d+(?:\.\d+)?|\+|\-|\*|\/|\^|%|\(|\))/g);
  if (!tokens || tokens.join('') !== s) return null;

  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
  const rightAssoc = { '^': true };
  const out = [];
  const ops = [];
  let prev = null;
  for (const tok of tokens) {
    if (/^\d/.test(tok)) {
      out.push(parseFloat(tok));
      prev = 'num';
    } else if (tok === '(') {
      ops.push(tok);
      prev = '(';
    } else if (tok === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
      if (!ops.length) return null;
      ops.pop();
      prev = ')';
    } else {
      if (tok === '-' && (prev === null || prev === '(' || prev === 'op')) {
        out.push(0);
      }
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top === '(') break;
        if (prec[top] > prec[tok] || (prec[top] === prec[tok] && !rightAssoc[tok])) out.push(ops.pop());
        else break;
      }
      ops.push(tok);
      prev = 'op';
    }
  }
  while (ops.length) {
    const op = ops.pop();
    if (op === '(') return null;
    out.push(op);
  }

  const stack = [];
  for (const tok of out) {
    if (typeof tok === 'number') stack.push(tok);
    else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      let v;
      switch (tok) {
        case '+': v = a + b; break;
        case '-': v = a - b; break;
        case '*': v = a * b; break;
        case '/': v = b === 0 ? NaN : a / b; break;
        case '%': v = a % b; break;
        case '^': v = Math.pow(a, b); break;
        default: return null;
      }
      stack.push(v);
    }
  }
  if (stack.length !== 1) return null;
  const value = stack[0];
  if (!Number.isFinite(value)) return null;
  const rounded = Math.abs(value) > 1e12 || (Math.abs(value) < 1e-6 && value !== 0)
    ? value.toExponential(6)
    : parseFloat(value.toFixed(10));
  return { value, display: String(rounded) };
}

/* ------------------------------------------------------------------ */
/* instant answers                                                     */
/* ------------------------------------------------------------------ */

async function duckAnswer(query) {
  const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) +
    '&format=json&no_html=1&skip_disambig=1&t=mg-browser';
  const data = await fetchJSON(url, 2800);
  if (!data) return null;
  const text = (data.AbstractText || data.Abstract || '').trim();
  if (!text) {
    const rel = (data.RelatedTopics || []).find((r) => r && r.Text);
    if (!rel) return null;
    return {
      kind: 'answer',
      title: data.Heading || query,
      text: rel.Text.slice(0, 420),
      url: rel.FirstURL || data.AbstractURL || '',
      source: 'DuckDuckGo',
      thumbnail: ''
    };
  }
  let thumb = data.Image || '';
  if (thumb && thumb.startsWith('/')) thumb = 'https://duckduckgo.com' + thumb;
  return {
    kind: 'answer',
    title: data.Heading || query,
    text: text.slice(0, 460),
    url: data.AbstractURL || '',
    source: 'DuckDuckGo',
    thumbnail: thumb
  };
}

async function wikiAnswer(query, lang) {
  const api = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=` +
    encodeURIComponent(query) +
    '&gsrlimit=1&prop=extracts|pageimages|info&inprop=url&exintro=1&explaintext=1&pithumbsize=160&format=json';
  const data = await fetchJSON(api, 3000);
  if (!data || !data.query || !data.query.pages) return null;
  const page = Object.values(data.query.pages)[0];
  if (!page) return null;
  const extract = (page.extract || '').replace(/\s+/g, ' ').trim();
  if (!extract) return null;
  return {
    kind: 'wiki',
    title: page.title,
    text: extract.slice(0, 460),
    url: page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    source: 'Wikipedia',
    thumbnail: page.thumbnail ? page.thumbnail.source : '',
    lang
  };
}

/* ------------------------------------------------------------------ */
/* omnibox payload                                                     */
/* ------------------------------------------------------------------ */

function scoreHistory(item, q) {
  const query = q.toLowerCase();
  const title = (item.title || '').toLowerCase();
  const url = (item.url || '').toLowerCase();
  let score = 0;
  if (title.startsWith(query)) score += 60;
  else if (title.includes(query)) score += 35;
  if (url.startsWith(query)) score += 45;
  else if (url.includes(query)) score += 25;
  const ageDays = (Date.now() - (item.visitedAt || 0)) / 86400000;
  score += Math.max(0, 12 - ageDays / 7);
  return score;
}

async function getOmniboxData(text, settings, ctx = {}) {
  const query = String(text || '').slice(0, 300);
  const trimmed = query.trim();
  const lang = langOf(settings);
  const engine = engineFor(settings);
  const empty = { query, suggestions: [], cards: [], history: [], tabs: [], engineId: engine.id };

  if (!trimmed) {
    return {
      ...empty,
      history: (ctx.history || []).slice(0, 6),
      tabs: (ctx.tabs || []).slice(0, 4)
    };
  }

  if (looksLikeUrl(trimmed)) {
    return {
      ...empty,
      isUrl: true,
      cards: [{
        kind: 'navigation',
        title: trimmed,
        text: /^[a-z]+:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed,
        url: normalizeUrl(trimmed),
        source: 'Go'
      }]
    };
  }

  const jobs = [];
  if (settings.omniboxSuggestions !== false) {
    if (engine.suggest) {
      jobs.push(
        fetchJSON(fill(engine.suggest, trimmed, lang), 2500)
          .then((raw) => parseSuggestions(raw).slice(0, 8).map((s) => ({ text: s, source: engine.name })))
          .catch(() => [])
      );
    } else {
      jobs.push(Promise.resolve([]));
    }
    if (engine.id !== 'wikipedia') {
      jobs.push(
        fetchJSON(fill(ENGINE_BY_ID.get('wikipedia').suggest, trimmed, lang), 2200)
          .then((raw) => parseSuggestions(raw).slice(0, 4).map((s) => ({ text: s, source: 'Wikipedia' })))
          .catch(() => [])
      );
    } else {
      jobs.push(Promise.resolve([]));
    }
  } else {
    jobs.push(Promise.resolve([]), Promise.resolve([]));
  }

  let cards = [];
  if (settings.liveResults !== false) {
    const math = tryMath(trimmed);
    if (math) {
      cards.push({
        kind: 'calc',
        title: trimmed,
        text: math.display,
        value: math.value,
        source: 'Calculator'
      });
    }
    const liveJobs = [duckAnswer(trimmed), wikiAnswer(trimmed, lang)];
    const settled = await Promise.allSettled(liveJobs);
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) cards.push(s.value);
    }
    // Avoid showing the same instant answer twice (e.g. Wikipedia + DDG).
    const deduped = [];
    for (const card of cards) {
      const title = String(card.title || '').trim().toLowerCase();
      const text = String(card.text || '').trim().toLowerCase().slice(0, 90);
      const duplicate = deduped.some((existing) => {
        if (card.kind === 'calc' || existing.kind === 'calc') return false;
        const et = String(existing.title || '').trim().toLowerCase();
        const ex = String(existing.text || '').trim().toLowerCase().slice(0, 90);
        return (title && title === et) || (text.length > 40 && text === ex);
      });
      if (!duplicate) deduped.push(card);
    }
    cards = deduped.filter((card) => {
      if (card.kind !== 'answer') return true;
      const wiki = deduped.find((c) => c.kind === 'wiki');
      if (!wiki) return true;
      const a = String(card.title || '').toLowerCase().trim();
      const w = String(wiki.title || '').toLowerCase().trim();
      return !(a === w || (a.length > 6 && (a.includes(w) || w.includes(a))));
    });
  }

  const [a, b] = await Promise.all(jobs);
  const seen = new Set();
  const suggestions = [];
  for (const s of [...a, ...b]) {
    const key = s.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(s);
    if (suggestions.length >= 9) break;
  }

  const history = (ctx.history || [])
    .map((h) => ({ ...h, _score: scoreHistory(h, trimmed) }))
    .filter((h) => h._score > 20)
    .sort((x, y) => y._score - x._score)
    .slice(0, 4);

  const tabs = (ctx.tabs || []).filter((t) =>
    (t.title || '').toLowerCase().includes(trimmed.toLowerCase()) ||
    (t.url || '').toLowerCase().includes(trimmed.toLowerCase())
  ).slice(0, 4);

  if (cards.length === 0 && trimmed.length > 2) {
    cards.push({
      kind: 'search',
      title: trimmed,
      text: `Search ${engine.name} for “${trimmed}”`,
      url: buildSearchUrl(settings, trimmed),
      source: engine.name,
      engineId: engine.id
    });
  }

  return { query, suggestions, cards, history, tabs, engineId: engine.id, isUrl: false };
}

module.exports = {
  BASE_ENGINES,
  ENGINES: BASE_ENGINES,
  enginesFor,
  engineFor,
  buildSearchUrl,
  looksLikeUrl,
  normalizeUrl,
  getOmniboxData,
  tryMath,
  langOf
};
