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
function openLoginWindow({ loginUrl, title, successUrlPattern, cookieUrls, getCookies, manualCloseMode = false }) {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 800,
      height: 700,
      title: manualCloseMode ? `${title} (ログイン完了後手動で閉じてください)` : title,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    loginWin.loadURL(loginUrl);

    let settled = false;

    const checkNavigation = async (url) => {
      if (settled || loginWin.isDestroyed()) return;
      if (manualCloseMode) return; // 手動クローズモード時は自動判定を行わない

      let isSuccessUrl = false;
      if (successUrlPattern && successUrlPattern.test(url)) {
        isSuccessUrl = true;
      }

      try {
        await new Promise(r => setTimeout(r, 2000));
        if (settled || loginWin.isDestroyed()) return;

        const allCookies = {};
        for (const cookieUrl of cookieUrls) {
          const cookies = await session.defaultSession.cookies.get({ url: cookieUrl });
          cookies.forEach(c => { allCookies[c.name] = c.value; });
        }
        
        const result = await getCookies(allCookies, url);

        if (isSuccessUrl || result.success) {
          if (settled || loginWin.isDestroyed()) return;
          settled = true;
          loginWin.close();
          resolve(result);
        }
      } catch (err) {
        console.error("Navigation cookie check error:", err.message);
      }
    };

    loginWin.webContents.on('did-navigate', (event, url) => checkNavigation(url));
    loginWin.webContents.on('did-navigate-in-page', (event, url) => checkNavigation(url));

    loginWin.on('closed', async () => {
      if (!settled) {
        settled = true; // 状態を確定
        if (manualCloseMode) {
          try {
            // 手動クローズ時に現在のCookieをすべて取り出して判定
            const allCookies = {};
            for (const cookieUrl of cookieUrls) {
              const cookies = await session.defaultSession.cookies.get({ url: cookieUrl });
              cookies.forEach(c => { allCookies[c.name] = c.value; });
            }
            const result = await getCookies(allCookies, "");
            resolve(result);
          } catch (e) {
            resolve({ success: false, error: 'Cookie取得エラー: ' + e.message });
          }
        } else {
          resolve({ success: false, error: 'ウィンドウが閉じられました' });
        }
      }
    });
  });
}

// X (Twitter) ログイン
ipcMain.handle('x-login', () => {
  return openLoginWindow({
    loginUrl: 'https://x.com/i/flow/login',
    title: 'X (Twitter) ログイン',
    successUrlPattern: /x\.com\/home|twitter\.com\/home/,
    cookieUrls: ['https://x.com', 'https://twitter.com'],
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
    successUrlPattern: /instagram\.com\/(accounts\/onetap|$)|\binstagram\.com\/(?!accounts\/login)/,
    cookieUrls: ['https://www.instagram.com'],
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
    // checkpoint・recovery・reCAPTCHAページは除外、ホーム("/")に遷移したら成功
    successUrlPattern: /facebook\.com\/(?!(login|r\.php|checkpoint|recover|two_step|privacy|help|dialog))/,
    cookieUrls: ['https://www.facebook.com', 'https://facebook.com'],
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
    cookieUrls: ['https://www.threads.com'],
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

// note ログイン
ipcMain.handle('note-login', () => {
  return openLoginWindow({
    loginUrl: 'https://note.com/login',
    title: 'note ログイン',
    successUrlPattern: null,
    cookieUrls: ['https://note.com'],
    manualCloseMode: true,
    getCookies: async (cookies) => {
      // 手動クローズ時に呼ばれ、存在するCookieをすべて返却します
      if (Object.keys(cookies).length > 0) {
        return { success: true, allCookies: cookies };
      }
      return { success: false, error: 'Cookieが見つかりません' };
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
