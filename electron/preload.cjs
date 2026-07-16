const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  saveDocxToDownloads: (payload) => ipcRenderer.invoke('save-docx-to-downloads', payload),
  showFileInFolder: (fullPath) => ipcRenderer.invoke('show-file-in-folder', fullPath),
});
