const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Sync Auto',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = 'http://localhost:3000';
  win.loadURL(url);
}

// X (Twitter) ログイン用の専用ウィンドウを開いてCookieを取得する
ipcMain.handle('x-login', async () => {
  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: 800,
      height: 700,
      title: 'X (Twitter) ログイン',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    loginWin.loadURL('https://x.com/i/flow/login');

    // ナビゲーションを監視してホームに到達したらCookieを取得
    loginWin.webContents.on('did-navigate', async (event, url) => {
      if (url.includes('x.com/home') || url.includes('twitter.com/home')) {
        try {
          // x.com のCookieを取得
          const cookies = await session.defaultSession.cookies.get({ domain: '.x.com' });
          const authToken = cookies.find(c => c.name === 'auth_token')?.value;
          const ct0 = cookies.find(c => c.name === 'ct0')?.value;

          loginWin.close();

          if (authToken && ct0) {
            resolve({ success: true, authToken, ct0 });
          } else {
            resolve({ success: false, error: 'Cookieの取得に失敗しました' });
          }
        } catch (err) {
          loginWin.close();
          reject(err);
        }
      }
    });

    loginWin.on('closed', () => {
      resolve({ success: false, error: 'ウィンドウが閉じられました' });
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
