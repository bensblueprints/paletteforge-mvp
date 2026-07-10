'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('paletteforge', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  pickLogo: () => ipcRenderer.invoke('dialog:pickLogo'),
  exportText: (payload) => ipcRenderer.invoke('export:text', payload),
  exportBinary: (payload) => ipcRenderer.invoke('export:binary', payload),
  exportASE: (palette, defaultPath) => ipcRenderer.invoke('export:ase', { palette, defaultPath }),
  exportPNG: (payload) => ipcRenderer.invoke('export:png', payload),
  importJSON: () => ipcRenderer.invoke('data:importJSON'),
});
