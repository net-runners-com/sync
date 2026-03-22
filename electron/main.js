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
          // Cookieがセッションにコミットされるまで少し待つ
          await new Promise(r => setTimeout(r, 1500));
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

// Instagram ログイン（X と同じ openLoginWindow 方式）
ipcMain.handle('instagram-login', () => {
  return openLoginWindow({
    loginUrl: 'https://www.instagram.com/accounts/login/',
    title: 'Instagram ログイン',
    // ログイン後 instagram.com/ (ホーム) に遷移したら成功
    successUrlPattern: /instagram\.com\/(accounts\/onetap|$)|\binstagram\.com\/(?!accounts\/login)/,
    cookieDomains: ['.instagram.com'],
    getCookies: async (cookies) => {
      const sessionId = cookies['sessionid'];
      const dsUserId = cookies['ds_user_id'];
      const csrftoken = cookies['csrftoken'];
      if (sessionId && dsUserId) return { success: true, sessionId, dsUserId, csrftoken };
      return { success: false, error: 'sessionid/ds_user_id Cookieが見つかりません' };
    },
  });
});

// Facebook ログイン
ipcMain.handle('facebook-login', () => {
  return openLoginWindow({
    loginUrl: 'https://www.facebook.com/login',
    title: 'Facebook ログイン',
    successUrlPattern: /facebook\.com(?!\/(login|r\.php))/,
    cookieDomains: ['.facebook.com', 'www.facebook.com'],
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
    loginUrl: 'https://www.threads.com/login',
    title: 'Threads ログイン',
    successUrlPattern: /threads\.com(?!\/(login|accounts))/,
    cookieDomains: ['.threads.com', '.instagram.com'],
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
