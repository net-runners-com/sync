import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { execSync, spawn } from "child_process";

const CDP_PORT = 9222;
// 実際のユーザーChromeプロファイル（ここが重要：ログイン済みCookieを活用）
const USER_DATA_DIR = `${process.env.HOME}/Library/Application Support/Google/Chrome`;
const CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isCDPReady(): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${CDP_PORT}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function killAllChrome(): Promise<void> {
  try {
    // Chromeを全て強制終了
    execSync(`pkill -f "Google Chrome" 2>/dev/null || true`, { stdio: "ignore" });
    // ポート9222も確実に解放
    execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
    await wait(1500); // プロセス終了を待つ
    console.log("[X-CDP] Chrome processes killed");
  } catch {
    // ignore
  }
}

async function launchChromeWithCDP(): Promise<void> {
  let isRunning = await isCDPReady();
  if (isRunning) {
    console.log("[X-CDP] CDP already running, skipping launch");
    return;
  }

  console.log("[X-CDP] Launching Chrome with CDP on port", CDP_PORT);
  
  // Chrome バイナリを直接spawnしてCDPモードで起動
  // 実プロファイルを使用するのでログイン済みCookieがそのまま使われる
  const child = spawn(CHROME_BIN, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-blink-features=AutomationControlled",
    "about:blank",
  ], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // CDP が準備完了するまで待機（最大20秒）
  for (let i = 0; i < 40; i++) {
    await wait(500);
    if (await isCDPReady()) {
      console.log("[X-CDP] Chrome CDP ready after", (i + 1) * 0.5, "seconds");
      return;
    }
  }

  throw new Error(
    "ChromeのCDP起動に失敗しました。\n" +
    "Google Chromeがインストールされているか確認してください。\n" +
    `パス: ${CHROME_BIN}`
  );
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let browser: any = null;

  try {
    // Step 1: 既存のChromeを全て終了（古いCDPセッションのクリア）
    await killAllChrome();

    // Step 2: 実Chromeをリモートデバッグモードで起動（既存プロファイル使用）
    await launchChromeWithCDP();

    // Step 3: 標準playwrightのconnectOverCDPで接続する
    // （rebrowser-playwrightはconnectOverCDPと非互換のため標準を使う）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require("playwright");
    browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);

    const defaultContext = browser.contexts()[0];
    const page = defaultContext
      ? defaultContext.pages()[0] || await defaultContext.newPage()
      : await browser.newContext().then((c: any) => c.newPage());

    // Step 4: x.comにアクセスしてログイン済みか確認
    await page.goto("https://x.com", { waitUntil: "load", timeout: 20000 }).catch(() => {});

    const isLoggedIn = await page.locator('a[href="/home"]').count() > 0;

    if (!isLoggedIn) {
      await page.goto("https://x.com/i/flow/login", { waitUntil: "load" });
      console.log("[X-CDP] ログイン画面を起動。ユーザーが手動でログイン中...");
      // locatorでホームリンク出現を待つ（CSP safe）
      await page.locator('a[href="/home"]').waitFor({ timeout: 300000 });
    }

    console.log("[X-CDP] ログイン確認完了。Cookie取得中...");

    // Step 5: Cookie取得
    const cookies = await defaultContext.cookies("https://x.com");
    const authToken = cookies.find((c: any) => c.name === "auth_token")?.value;
    const ct0 = cookies.find((c: any) => c.name === "ct0")?.value;

    if (!authToken || !ct0) {
      await browser.close();
      return NextResponse.json(
        { error: "auth_token/ct0 Cookieが見つかりません。ログインが完了しているか確認してください。" },
        { status: 400 }
      );
    }

    // Step 6: ユーザー情報取得（ページのXHRコンテキストを利用）
    const meRes = await page.evaluate(async (ct0Token: string) => {
      try {
        const res = await fetch(
          "https://api.twitter.com/2/users/me?user.fields=id,name,username",
          {
            headers: { "x-csrf-token": ct0Token, "content-type": "application/json" },
            credentials: "include",
          }
        );
        return res.json();
      } catch { return {}; }
    }, ct0);

    await browser.close();
    browser = null;

    const userId: string = meRes?.data?.id ?? `x_${Date.now()}`;
    const username: string = meRes?.data?.username ?? "Unknown";
    const name: string = meRes?.data?.name ?? "X User";

    // Step 7: DBに保存
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "twitter", providerAccountId: userId } },
      update: { access_token: authToken, refresh_token: ct0, scope: "cookie-auth" },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "twitter",
        providerAccountId: userId,
        access_token: authToken,
        refresh_token: ct0,
        scope: "cookie-auth",
        token_type: "cookie",
      },
    });

    return NextResponse.json({ success: true, username, name, userId });
  } catch (error: any) {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    console.error("[X-CDP] Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
