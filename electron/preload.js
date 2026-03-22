const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // X (Twitter) ログイン
  xLogin: () => ipcRenderer.invoke('x-login'),
  // Instagram ログイン
  instagramLogin: () => ipcRenderer.invoke('instagram-login'),
  // Facebook ログイン
  facebookLogin: () => ipcRenderer.invoke('facebook-login'),
  // Threads ログイン
  threadsLogin: () => ipcRenderer.invoke('threads-login'),
  // note ログイン
  noteLogin: () => ipcRenderer.invoke('note-login'),
});
