import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 各プラットフォームからのインサイトモックデータを生成
// （※本来は accessToken を使って各SNSのGraph APIやTwitter APIから情報を取得します）
function generateMockAnalytics(platform: string, connected: boolean) {
  if (!connected) return null;

  // 1ヶ月分のダミーデータ
  const data = [];
  const now = new Date();
  
  let followers = platform === 'instagram' ? 12400 : platform === 'facebook' ? 8500 : 4200;
  let baseImpressions = platform === 'instagram' ? 5000 : platform === 'facebook' ? 3000 : 8000;

  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    // 日々のランダムな変動
    followers += Math.floor(Math.random() * 20) - 5; 
    const impressions = baseImpressions + Math.floor(Math.random() * 2000) - 1000;
    const engagements = Math.floor(impressions * (Math.random() * 0.05 + 0.02)); // 2~7%
    
    data.push({
      date: d.toISOString().split('T')[0],
      followers,
      impressions,
      engagements,
    });
  }

  return {
    summary: {
      totalFollowers: followers,
      monthlyImpressions: data.reduce((sum, d) => sum + d.impressions, 0),
      monthlyEngagements: data.reduce((sum, d) => sum + d.engagements, 0),
    },
    timeseries: data,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 連携済みのSNSアカウントを取得
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true, access_token: true },
    });

    const connectedProviders = new Set(accounts.map((a: any) => a.provider));

    // ※今回は実APIの呼び出し制限やApp Reviewプロセスの都合上、
    // トークンが存在するプラットフォームに対してリアルなモックデータを返却します。
    // 実稼働時はここに `fetch("https://graph.facebook.com/v19.0/me/insights...")` などを実装します。

    const analyticsData = {
      facebook: generateMockAnalytics("facebook", connectedProviders.has("facebook")),
      instagram: generateMockAnalytics("instagram", connectedProviders.has("facebook")), // IGはFBトークンに紐付く
      twitter: generateMockAnalytics("twitter", connectedProviders.has("twitter")),
    };

    return NextResponse.json({ data: analyticsData });
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
