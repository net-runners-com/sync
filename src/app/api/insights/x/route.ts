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

    // 【重要ハック】Twitter仕様変更によりv1.1系API（verify_credentials等）が全滅しているため、
    // agent-twitter-clientの isLoggedIn() はCookie認証では常に失敗(404)します。
    // 強制的にisLoggedIn()をバイパスし、GraphQL (UserByRestId) 経由でプロフィールを取得させます。
    scraper.isLoggedIn = async () => true;
    if ((scraper as any).auth) {
      (scraper as any).auth.isLoggedIn = async () => true;
    }

    // クッキー（またはx-playwright連携時）と一緒にDB保存された数値ID(providerAccountId)を取得
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "twitter", scope: "cookie-auth" },
    });

    if (!account || !account.providerAccountId) {
      return NextResponse.json({ error: "XアカウントのIDが見つかりません。再連携してください。" }, { status: 400 });
    }

    const numericUserId = account.providerAccountId;
    let meUsername: string | undefined = undefined;

    try {
      console.log(`[X-Login-Debug] Fetching screen_name for REST ID: ${numericUserId}`);
      const screenName = await scraper.getScreenNameByUserId(numericUserId);
      if (screenName) {
        meUsername = screenName;
      }
    } catch (e: any) {
      console.error("[X-Login-Debug] Failed to fetch screen_name via GraphQL:", e.message);
    }

    console.log("[X-Login-Debug] Extracted meUsername:", meUsername);

    if (!meUsername || meUsername.startsWith("x_")) {
      return NextResponse.json(
        { error: "Xのセッションが切れているか、ユーザー情報の取得に失敗しました。設定から「連携解除」し、再度「連携する」をお試しください。" },
        { status: 401 }
      );
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

