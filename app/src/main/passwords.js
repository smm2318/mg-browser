'use strict';

const crypto = require('node:crypto');
const os = require('node:os');
const { safeStorage } = require('electron');

const FALLBACK_SALT = 'mg-browser-vault-v1';

function fallbackKey() {
  const seed = `${os.userInfo().username}|${os.hostname()}|MG-Browser|${FALLBACK_SALT}`;
  return crypto.scryptSync(seed, 'mg-salt-2024', 32);
}

class PasswordVault {
  constructor(store) {
    this.store = store;
    this.entries = null;
  }

  _encrypt(entries) {
    const payload = JSON.stringify(entries);
    if (safeStorage.isEncryptionAvailable()) {
      return {
        scheme: 'safeStorage',
        data: safeStorage.encryptString(payload).toString('base64')
      };
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', fallbackKey(), iv);
    const enc = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    return {
      scheme: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: enc.toString('base64')
    };
  }

  _decrypt(blob) {
    if (!blob || !blob.data) return [];
    try {
      if (blob.scheme === 'safeStorage') {
        if (!safeStorage.isEncryptionAvailable()) return [];
        const raw = safeStorage.decryptString(Buffer.from(blob.data, 'base64'));
        return JSON.parse(raw);
      }
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        fallbackKey(),
        Buffer.from(blob.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
      const raw = Buffer.concat([
        decipher.update(Buffer.from(blob.data, 'base64')),
        decipher.final()
      ]).toString('utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('[vault] decrypt failed', err.message);
      return [];
    }
  }

  load() {
    if (this.entries) return this.entries;
    this.entries = this._decrypt(this.store.data.passwords);
    return this.entries;
  }

  persist() {
    this.store.data.passwords = this._encrypt(this.entries || []);
    this.store.save();
  }

  list() {
    return this.load().map((e) => ({
      id: e.id,
      origin: e.origin,
      host: e.host,
      username: e.username,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      length: (e.password || '').length
    }));
  }

  forOrigin(origin) {
    return this.load().filter((e) => e.origin === origin);
  }

  add({ origin, username, password }) {
    if (!origin || !password) return null;
    const entries = this.load();
    let entry = entries.find((e) => e.origin === origin && e.username === username);
    if (entry) {
      entry.password = password;
      entry.updatedAt = Date.now();
    } else {
      let host = origin;
      try { host = new URL(origin).host; } catch { /* ignore */ }
      entry = {
        id: crypto.randomUUID(),
        origin,
        host,
        username: username || '',
        password,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      entries.unshift(entry);
    }
    this.persist();
    return entry.id;
  }

  update(id, patch) {
    const entry = this.load().find((e) => e.id === id);
    if (!entry) return false;
    if (patch.username !== undefined) entry.username = patch.username;
    if (patch.password !== undefined) entry.password = patch.password;
    entry.updatedAt = Date.now();
    this.persist();
    return true;
  }

  remove(id) {
    const entries = this.load();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    entries.splice(idx, 1);
    this.persist();
    return true;
  }

  reveal(id) {
    const entry = this.load().find((e) => e.id === id);
    return entry ? entry.password : null;
  }

  dismissSite(origin) {
    const list = this.store.data.dismissedSites;
    if (!list.includes(origin)) {
      list.push(origin);
      this.store.save();
    }
  }

  isDismissed(origin) {
    return this.store.data.dismissedSites.includes(origin);
  }

  static generate({ length = 20, symbols = true, digits = true, uppercase = true } = {}) {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const syms = '!@#$%^&*()-_=+[]{}?';
    let pool = lower;
    const required = [lower[crypto.randomInt(lower.length)]];
    if (uppercase) { pool += upper; required.push(upper[crypto.randomInt(upper.length)]); }
    if (digits) { pool += nums; required.push(nums[crypto.randomInt(nums.length)]); }
    if (symbols) { pool += syms; required.push(syms[crypto.randomInt(syms.length)]); }
    const len = Math.max(length, required.length + 4);
    const chars = [...required];
    for (let i = required.length; i < len; i++) {
      chars.push(pool[crypto.randomInt(pool.length)]);
    }
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }
}

module.exports = { PasswordVault };
