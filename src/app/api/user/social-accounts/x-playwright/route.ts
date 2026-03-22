import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import os from "os";
import fs from "fs";

const AUTH_STATE_DIR = path.join(os.homedir(), ".sync-app");
const AUTH_STATE_PATH = path.join(AUTH_STATE_DIR, "x-auth.json");

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 専用の独立プロファイルディレクトリ（既存Chromeと干渉しない）
  const userDataDir = path.join(AUTH_STATE_DIR, "chrome-profile-x");

  // storageState の保存先ディレクトリを作成
  if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
  }

  let context: any = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require("rebrowser-playwright");

    // ベストプラクティス:
    //   - launchPersistentContext で専用プロファイルを永続化（2回目以降はログイン不要）
    //   - channel: "chrome" で実Chromium ではなく実Google Chromeを使用
    //   - headless: false, noViewport: true
    //   - カスタムUA/ヘッダーは指定しない
    const contextOptions: Record<string, unknown> = {
      channel: "chrome",
      headless: false,
      noViewport: true,
    };

    // 既存のstorageStateがあれば読み込む（ログイン済みセッションを復元）
    if (fs.existsSync(AUTH_STATE_PATH)) {
      contextOptions.storageState = AUTH_STATE_PATH;
    }

    context = await chromium.launchPersistentContext(userDataDir, contextOptions);

    const page = await context.newPage();

    // X.comを開いてログイン済みか確認
    await page.goto("https://x.com", { waitUntil: "load" });

    // ログイン済みの判定: タイムライン上のNavBarにある「ホーム」リンクの存在で確認
    // waitForFunction(eval) の代わりに locator を使用 → CSP違反を回避
    const homeLink = page.locator('a[href="/home"]');
    const isLoggedIn = await homeLink.count() > 0;

    if (!isLoggedIn) {
      // ログインページへ遷移
      await page.goto("https://x.com/i/flow/login", { waitUntil: "load" });
      console.log("[X-Playwright] 手動でXにログインしてください...(最大5分)");
      console.log("[X-Playwright] ※ Googleでサインインは使わずID/パスワードでログインしてください");

      // 「ホーム」リンクが表示されるのを待つ(ログイン完了の目印)
      await page.locator('a[href="/home"]').waitFor({ timeout: 300000 });
    }

    console.log("[X-Playwright] ログイン確認完了。Cookie取得中...");

    // storageState を保存（次回以降のログイン不要化）
    await context.storageState({ path: AUTH_STATE_PATH });

    // Cookie取得
    const cookies = await context.cookies("https://x.com");
    const authToken = cookies.find((c: any) => c.name === "auth_token")?.value;
    const ct0 = cookies.find((c: any) => c.name === "ct0")?.value;

    if (!authToken || !ct0) {
      await context.close();
      return NextResponse.json(
        { error: "Cookie取得に失敗しました。ログインが完了しているか確認してください。" },
        { status: 400 }
      );
    }

    // X内部APIでユーザー情報を取得
    const meRes = await page.evaluate(async (ct0Token: string) => {
      const res = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=id,name,username",
        {
          headers: { "x-csrf-token": ct0Token, "content-type": "application/json" },
          credentials: "include",
        }
      );
      return res.json();
    }, ct0);

    await context.close();
    context = null;

    const userId: string = meRes?.data?.id ?? `x_${Date.now()}`;
    const username: string = meRes?.data?.username ?? "Unknown";
    const name: string = meRes?.data?.name ?? "X User";

    // DBに保存
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
    if (context) {
      try { await context.close(); } catch { /* ignore */ }
    }
    console.error("[X-Playwright] Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
