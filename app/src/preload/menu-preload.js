'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mgMenu', {
  onData(callback) {
    ipcRenderer.on('menu:data', (_event, data) => callback(data));
  },
  pick(id) {
    ipcRenderer.send('menu:pick', id);
  },
  close() {
    ipcRenderer.send('menu:close');
  }
});
