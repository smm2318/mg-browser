'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Map();

function onEvent(callback) {
  const handler = (_event, data) => {
    if (data && typeof data.type === 'string') callback(data.type, data.payload);
  };
  ipcRenderer.on('mg:event', handler);
  return () => ipcRenderer.removeListener('mg:event', handler);
}

contextBridge.exposeInMainWorld('mg', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions,
  call: (action, payload) => ipcRenderer.invoke('mg:call', action, payload || {}),
  onEvent,
  on(type, callback) {
    const wrapped = (event) => {
      const data = event && event.payload;
      callback(data);
    };
    const handler = (_event, data) => {
      if (data && data.type === type) callback(data.payload);
    };
    ipcRenderer.on('mg:event', handler);
    const entry = { type, handler };
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(entry);
    return () => {
      ipcRenderer.removeListener('mg:event', handler);
      const list = listeners.get(type) || [];
      const idx = list.indexOf(entry);
      if (idx >= 0) list.splice(idx, 1);
    };
  }
});
