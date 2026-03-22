/**
 * /api/insights/x/route.ts
 * X(Twitter)インサイト取得APIルート
 *
 * - agent-twitter-client を使用してCookie認証でデータ取得
 * - 12時間キャッシュでBANリスクを最小化
 * - DB保存: SocialInsightsテーブル (userId + "twitter")
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getXCookies, createXScraper } from "@/lib/x-scraper";
import { fetchXInsights } from "@/lib/x-insights";

const CACHE_HOURS = 12;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.has("force");

  // ─── キャッシュ確認 ───────────────────────────
  if (!force) {
    const cached = await prisma.socialInsights.findUnique({
      where: { userId_platform: { userId: session.user.id, platform: "twitter" } },
    });
    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (ageMs < CACHE_HOURS * 60 * 60 * 1000) {
        return NextResponse.json({
          data: cached.data,
          cached: true,
          fetchedAt: cached.fetchedAt.toISOString(),
        });
      }
    }
  }

  // ─── Cookie取得 ──────────────────────────────
  const cookies = await getXCookies(session.user.id);
  if (!cookies) {
    return NextResponse.json(
      { error: "X (Twitter) が連携されていません。設定から連携してください。" },
      { status: 404 }
    );
  }

  // ─── agent-twitter-client でデータ取得 ───────
  try {
    const scraper = await createXScraper(cookies);
    
    // DEBUG: ParseされたCookieを確認
    const parsedCookies = await scraper.getCookies();
    console.log("[X-Login-Debug] Parsed cookies count:", parsedCookies.length);
    console.log("[X-Login-Debug] Cookie example:", parsedCookies.map(c => `${c.key}=***; domain=${c.domain}`).join(", "));

    // ★ TEST: Can we fetch settings.json directly?
    try {
      const res = await fetch("https://api.twitter.com/1.1/account/settings.json", {
        headers: {
          "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
          "Cookie": `auth_token=${cookies.authToken}; ct0=${cookies.ct0}`,
          "x-csrf-token": cookies.ct0,
          "x-twitter-active-user": "yes",
          "x-twitter-auth-type": "OAuth2Session",
          "Content-Type": "application/json",
        }
      });
      console.log("[X-Login-Debug] settings.json status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[X-Login-Debug] settings screen_name:", data.screen_name);
      } else {
        console.log("[X-Login-Debug] settings.json error body:", await res.text());
      }
    } catch (e) {
      console.log("[X-Login-Debug] settings.json fetch failed", e);
    }

    const isLoggedIn = await scraper.isLoggedIn();
    console.log("[X-Login-Debug] isLoggedIn result:", isLoggedIn);
    
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: "Xのセッションが切れています。設定から再連携してください。（デバッグ中）" },
        { status: 401 }
      );
    }

    const meUsername = (await scraper.me())?.username;
    console.log("[X-Login-Debug] meUsername:", meUsername);
    if (!meUsername) {
      return NextResponse.json({ error: "ユーザー名の取得に失敗しました" }, { status: 500 });
    }

    const insights = await fetchXInsights(scraper, meUsername);

    await prisma.socialInsights.upsert({
      where: { userId_platform: { userId: session.user.id, platform: "twitter" } },
      update: { data: insights as any, fetchedAt: new Date() },
      create: { userId: session.user.id, platform: "twitter", data: insights as any },
    });

    return NextResponse.json({ data: insights, cached: false, fetchedAt: insights.fetchedAt });
  } catch (err: any) {
    console.error("[X Insights] Error:", err);
    const stale = await prisma.socialInsights.findUnique({
      where: { userId_platform: { userId: session.user.id, platform: "twitter" } },
    });
    if (stale) {
      return NextResponse.json({
        data: stale.data, cached: true, stale: true,
        fetchedAt: stale.fetchedAt.toISOString(),
        warning: "最新データの取得に失敗しました。キャッシュを返しています。",
      });
    }
    return NextResponse.json({ error: err.message ?? "取得失敗" }, { status: 500 });
  }
}

