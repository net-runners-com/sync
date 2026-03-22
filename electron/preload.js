const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // X (Twitter) の Playwright 連携など、必要に応じて IPC メソッドを追加します
});
