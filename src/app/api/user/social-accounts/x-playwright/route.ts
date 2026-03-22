import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const CDP_PORT = 9222;
const USER_DATA_DIR = `${process.env.HOME}/Library/Application Support/Google/Chrome`;
const CHROME_APP = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// 古いChromeのCDPプロセスを強制终了
async function killExistingCDP(): Promise<void> {
  try {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execA = promisify(exec);
    await execA(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null || true`);
    await new Promise((r) => setTimeout(r, 800)); // 少し待つ
  } catch { /* ignore */ }
}

// Chromeをリモートデバッグモードで起動（既存プロファイルを利用）
async function launchChromeWithCDP(): Promise<void> {
  const cmd = [
    `open -a "Google Chrome" --args`,
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir="${USER_DATA_DIR}"`,
    `--no-first-run`,
    `--disable-blink-features=AutomationControlled`,
  ].join(" ");
  console.log("[X-Playwright] Launching Chrome with CDP...");
  await execAsync(cmd);

  // Chrome起動を待機（最大15秒）
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        console.log("[X-Playwright] Chrome CDP ready");
        return;
      }
    } catch { /* まだ起動中 */ }
  }

  throw new Error("Google Chromeのリモートデバッグの起動に失敗しました。Chromeがインストールされているか確認してください。");
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let browser: any = null;

  try {
    // CDP接続には通常のplaywrightを使用（既存の実Chromeに接続するため検知回避パッチは不要）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require("playwright");

    // Step 0: 古いCDPセッションを強制終了（rebrowser等の残骸に起因するハングを防ぐ）
    await killExistingCDP();

    // Step 1: 既存ChromeをCDPモードで起動
    await launchChromeWithCDP();

    // Step 2: CDPで既存Chromeに接続（プロファイルのCookieがそのまま使われる）
    browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);

    const contexts = browser.contexts();
    const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    const page = await context.newPage();

    // Step 3: x.com/home へ遷移してログイン済みか確認
    console.log("[X-Playwright] Navigating to x.com/home...");
    try {
      await page.goto("https://x.com/home", { waitUntil: "load", timeout: 15000 });
    } catch {
      // リダイレクト or タイムアウトはOK
    }

    const isLoggedIn = page.url().includes("x.com/home");

    if (!isLoggedIn) {
      // ログインページへ遷移してユーザーが手動ログインするのを待つ
      await page.goto("https://x.com/i/flow/login", { waitUntil: "load" });
      console.log("[X-Playwright] Chromeが起動しました。ローカルのChromeでXにログインしてください...");

      await page.waitForFunction(
        () => window.location.href.includes("x.com/home"),
        { timeout: 300000 }
      );
    }

    // Step 4: Cookie取得
    const cookies = await context.cookies("https://x.com");
    const authToken = cookies.find((c: any) => c.name === "auth_token")?.value;
    const ct0 = cookies.find((c: any) => c.name === "ct0")?.value;

    if (!authToken || !ct0) {
      await browser.close();
      return NextResponse.json(
        { error: "Cookie取得に失敗しました。Xへのログインが完了しているか確認してください。" },
        { status: 400 }
      );
    }

    // Step 5: ユーザー情報取得
    const meRes = await page.evaluate(async (ct0Token: string) => {
      const res = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url",
        {
          headers: { "x-csrf-token": ct0Token, "content-type": "application/json" },
          credentials: "include",
        }
      );
      return res.json();
    }, ct0);

    await browser.close();
    browser = null;

    const userId: string = meRes?.data?.id ?? `x_${Date.now()}`;
    const username: string = meRes?.data?.username ?? "Unknown";
    const name: string = meRes?.data?.name ?? "X User";

    // Step 6: DBに保存
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
    console.error("[X-Playwright] Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
