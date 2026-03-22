const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // X (Twitter) ログイン: Electronウィンドウを開いてCookieを取得
  xLogin: () => ipcRenderer.invoke('x-login'),
});
