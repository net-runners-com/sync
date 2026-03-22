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

// ソーシャルログインウィンドウ共通関数
function openLoginWindow({ loginUrl, title, successUrlPattern, cookieDomains, getCookies }) {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 800,
      height: 700,
      title,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    loginWin.loadURL(loginUrl);

    const checkNavigation = async (url) => {
      if (successUrlPattern.test(url)) {
        try {
          const allCookies = {};
          for (const domain of cookieDomains) {
            const cookies = await session.defaultSession.cookies.get({ domain });
            cookies.forEach(c => { allCookies[c.name] = c.value; });
          }
          const result = await getCookies(allCookies);
          loginWin.close();
          resolve(result);
        } catch (err) {
          loginWin.close();
          resolve({ success: false, error: err.message });
        }
      }
    };

    loginWin.webContents.on('did-navigate', (event, url) => checkNavigation(url));
    loginWin.webContents.on('did-navigate-in-page', (event, url) => checkNavigation(url));

    loginWin.on('closed', () => {
      resolve({ success: false, error: 'ウィンドウが閉じられました' });
    });
  });
}

// X (Twitter) ログイン
ipcMain.handle('x-login', () => {
  return openLoginWindow({
    loginUrl: 'https://x.com/i/flow/login',
    title: 'X (Twitter) ログイン',
    successUrlPattern: /x\.com\/home|twitter\.com\/home/,
    cookieDomains: ['.x.com', '.twitter.com'],
    getCookies: async (cookies) => {
      const authToken = cookies['auth_token'];
      const ct0 = cookies['ct0'];
      if (authToken && ct0) return { success: true, authToken, ct0 };
      return { success: false, error: 'auth_token/ct0 Cookieが見つかりません' };
    },
  });
});

// Instagram ログイン
ipcMain.handle('instagram-login', () => {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 800,
      height: 700,
      title: 'Instagram ログイン',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    loginWin.loadURL('https://www.instagram.com/#');

    // sessionid Cookieが現れるまでポーリング（最大5分）
    let done = false;
    const poll = setInterval(async () => {
      try {
        const cookies = await session.defaultSession.cookies.get({ domain: '.instagram.com' });
        const sessionId = cookies.find(c => c.name === 'sessionid')?.value;
        const dsUserId = cookies.find(c => c.name === 'ds_user_id')?.value;
        const csrftoken = cookies.find(c => c.name === 'csrftoken')?.value;
        if (sessionId && dsUserId && !done) {
          done = true;
          clearInterval(poll);
          loginWin.close();
          resolve({ success: true, sessionId, dsUserId, csrftoken });
        }
      } catch { /* ignore */ }
    }, 1000);

    // 5分タイムアウト
    setTimeout(() => {
      if (!done) {
        done = true;
        clearInterval(poll);
        if (!loginWin.isDestroyed()) loginWin.close();
        resolve({ success: false, error: 'タイムアウト: ログインが完了しませんでした' });
      }
    }, 300000);

    loginWin.on('closed', () => {
      if (!done) {
        done = true;
        clearInterval(poll);
        resolve({ success: false, error: 'ウィンドウが閉じられました' });
      }
    });
  });
});

// Facebook ログイン
ipcMain.handle('facebook-login', () => {
  return openLoginWindow({
    loginUrl: 'https://www.facebook.com/login',
    title: 'Facebook ログイン',
    successUrlPattern: /facebook\.com(?!\/(login|r\.php))/,
    cookieDomains: ['.facebook.com'],
    getCookies: async (cookies) => {
      const cUser = cookies['c_user'];
      const xs = cookies['xs'];
      const datr = cookies['datr'];
      if (cUser && xs) {
        return { success: true, cUser, xs, datr };
      }
      return { success: false, error: 'c_user/xs Cookieが見つかりません' };
    },
  });
});

// Threads ログイン
ipcMain.handle('threads-login', () => {
  return openLoginWindow({
    loginUrl: 'https://www.threads.net/login',
    title: 'Threads ログイン',
    successUrlPattern: /threads\.net(?!\/(login|accounts))/,
    cookieDomains: ['.threads.net', '.instagram.com'],
    getCookies: async (cookies) => {
      const sessionId = cookies['sessionid'];
      const dsUserId = cookies['ds_user_id'];
      if (sessionId) {
        return { success: true, sessionId, dsUserId };
      }
      return { success: false, error: 'sessionid Cookieが見つかりません' };
    },
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
