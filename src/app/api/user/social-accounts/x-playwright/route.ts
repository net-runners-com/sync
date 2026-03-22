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

  let context: any = null;
  let browser: any = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require("rebrowser-playwright");

    // Patchright/rebrowserのベストプラクティス:
    //   - launchPersistentContext を使い、ユーザーデータディレクトリを固定する
    //   - channel: "chrome" でシステムにインストール済みの実Chromeを利用する
    //   - headless: false, noViewport: true
    //   - カスタムのUser-Agent/Viewportは設定しない
    const userDataDir = path.join(os.homedir(), ".sync-app", "chrome-profile-x");

    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: false,
      noViewport: true,
      // カスタムヘッダーやUser-Agentは指定しない (Bot検知を避けるため)
    });

    const page = await context.newPage();

    // すでにXにログインしているか確認 (タイムアウトは緩めに設定)
    try {
      await page.goto("https://x.com/home", { waitUntil: "load", timeout: 15000 });
    } catch {
      // タイムアウト or リダイレクトはOK (ログインページにいる場合など)
    }

    const isAlreadyLoggedIn = page.url().includes("x.com/home");

    if (!isAlreadyLoggedIn) {
      // ログインページへ遷移
      await page.goto("https://x.com/i/flow/login", { waitUntil: "load" });
      console.log("[X-Playwright] Waiting for user to login manually... (timeout: 5min)");
      console.log("[X-Playwright] ⚠️  Googleでサインインは使わず、ID/パスワードでログインしてください。");

      // ユーザーが手動でログインするのを待つ
      // urlが x.com/home に遷移するまで待機 (networkidleでなく load で)
      await page.waitForFunction(
        () => window.location.href.includes("x.com/home"),
        { timeout: 300000 }
      );
    }

    // Cookie取得
    const cookies = await context.cookies("https://x.com");
    const authToken = cookies.find((c: any) => c.name === "auth_token")?.value;
    const ct0 = cookies.find((c: any) => c.name === "ct0")?.value;

    if (!authToken || !ct0) {
      await context.close();
      return NextResponse.json(
        { error: "Cookie取得に失敗しました。ログインが完了していない可能性があります。" },
        { status: 400 }
      );
    }

    // ページ内でX内部APIを叩いてユーザー情報取得
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

    // DBに保存（auth_token と ct0 をCookie認証として保存）
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "twitter",
          providerAccountId: userId,
        },
      },
      update: {
        access_token: authToken,
        refresh_token: ct0,
        scope: "cookie-auth",
      },
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
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    console.error("[X-Playwright] Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
