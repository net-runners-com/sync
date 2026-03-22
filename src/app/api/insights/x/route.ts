import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chromium } from "playwright";

const CACHE_HOURS = 12; // 1日2回まで
const X_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

// ランダムウェイト（BANリスク低減）
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min = 2000, max = 5000) => sleep(min + Math.random() * (max - min));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // キャッシュ確認（12時間以内なら返す）
  const cached = await prisma.socialInsights.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "twitter" } },
  });
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_HOURS * 60 * 60 * 1000) {
      return NextResponse.json({ data: cached.data, cached: true, fetchedAt: cached.fetchedAt });
    }
  }

  // 連携済みのX Cookieを取得
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "twitter" },
    select: { access_token: true, refresh_token: true },
  });
  if (!account?.access_token) {
    return NextResponse.json({ error: "X (Twitter) が連携されていません" }, { status: 404 });
  }

  const authToken = account.access_token;  // auth_token
  const ct0 = account.refresh_token || ""; // ct0

  let browser;
  try {
    // 人間のブラウザに偽装したPlaywrightを起動
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      extraHTTPHeaders: {
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    // 保存済みCookieをセット
    await context.addCookies([
      { name: "auth_token", value: authToken, domain: ".x.com", path: "/" },
      { name: "ct0", value: ct0, domain: ".x.com", path: "/" },
      { name: "auth_token", value: authToken, domain: ".twitter.com", path: "/" },
      { name: "ct0", value: ct0, domain: ".twitter.com", path: "/" },
    ]);

    const page = await context.newPage();

    // ネットワークインターセプトでAPIレスポンスを取得
    const captured: Record<string, any> = {};

    page.on("response", async (res) => {
      const url = res.url();
      try {
        if (url.includes("api.twitter.com/1.1/account/verify_credentials")) {
          captured.verifyCredentials = await res.json();
        }
        if (url.includes("UserByScreenName") && res.request().method() === "GET") {
          const body = await res.json();
          if (body?.data?.user?.result) {
            captured.userByScreenName = body.data.user.result;
          }
        }
        if (url.includes("/UserTweets") && !captured.tweets) {
          const body = await res.json();
          captured.tweets = body;
        }
      } catch { /* ignore parse errors */ }
    });

    // X.comホーム → 人間らしい操作
    await page.goto("https://x.com/home", { waitUntil: "networkidle", timeout: 30000 });
    await randomDelay(2000, 4000);

    // verify_credentialsを直接叩く（最も信頼性高い）
    const verifyRes = await page.evaluate(async (params) => {
      const { authToken, ct0, bearer } = params;
      try {
        const r = await fetch("https://api.twitter.com/1.1/account/verify_credentials.json?include_email=false", {
          headers: {
            "Authorization": `Bearer ${bearer}`,
            "Cookie": `auth_token=${authToken}; ct0=${ct0}`,
            "x-csrf-token": ct0,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        return await r.json();
      } catch (e: any) { return { error: e.message }; }
    }, { authToken, ct0, bearer: X_BEARER });

    await randomDelay(1000, 3000);

    const userData: Record<string, any> = verifyRes || {};
    const followersCount = userData.followers_count ?? null;
    const followingCount = userData.friends_count ?? null;
    const tweetsCount = userData.statuses_count ?? null;
    const screenName = userData.screen_name ?? null;
    const name = userData.name ?? null;
    const profileImageUrl = userData.profile_image_url_https ?? null;

    const data = {
      screenName,
      name,
      profileImageUrl,
      followersCount,
      followingCount,
      tweetsCount,
      fetchedAt: new Date().toISOString(),
    };

    // DBに保存（キャッシュ）
    await prisma.socialInsights.upsert({
      where: { userId_platform: { userId: session.user.id, platform: "twitter" } },
      update: { data: data as any, fetchedAt: new Date() },
      create: { userId: session.user.id, platform: "twitter", data: data as any },
    });

    return NextResponse.json({ data, cached: false });
  } catch (err: any) {
    console.error("[X Insights] Error:", err);
    // エラー時はキャッシュを返す
    if (cached) {
      return NextResponse.json({ data: cached.data, cached: true, fetchedAt: cached.fetchedAt, stale: true });
    }
    return NextResponse.json({ error: err.message || "取得失敗" }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
