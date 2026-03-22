import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import os from "os";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 専用プロファイルディレクトリ（既存Chromeと干渉しない独立した領域）
  // 一度ログインするとCookieがここに永続保存され、次回は自動ログイン状態になる
  const userDataDir = path.join(os.homedir(), ".sync-app", "chrome-profile-x");

  let context: any = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require("rebrowser-playwright");

    // ベストプラクティス (Patchright準拠):
    //   - launchPersistentContext で専用プロファイルを永続化
    //   - channel: "chrome" で実Chromeバイナリを使用 (独立プロファイルなので既存Chromeと競合しない)
    //   - headless: false / noViewport: true
    //   - カスタムUA・ヘッダーは設定しない
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: false,
      noViewport: true,
    });

    const page = await context.newPage();

    // プロファイルにCookieが残っていればホームに直行、なければログインページへ
    await page.goto("https://x.com", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const isLoggedIn = page.url().includes("x.com/home") || page.url().includes("x.com/?");

    if (!isLoggedIn) {
      await page.goto("https://x.com/i/flow/login", { waitUntil: "load" });

      console.log("[X-Playwright] ブラウザが起動しました。X.comにIDとパスワードでログインしてください。");
      console.log("[X-Playwright] ※ 「Googleでサインイン」は使わないでください。");

      // ログイン完了（x.com/home に遷移）したら自動的に続行
      // waitForFunction は X.com の CSP (unsafe-eval 禁止) でブロックされるため waitForURL を使用
      await page.waitForURL(/x\.com\/home/, { timeout: 300000 });
    }

    console.log("[X-Playwright] Logged in! Fetching cookies...");

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

    // ユーザー情報取得
    const meRes = await page.evaluate(async (ct0Token: string) => {
      const res = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url",
        {
          headers: {
            "x-csrf-token": ct0Token,
            "content-type": "application/json",
          },
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
