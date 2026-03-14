import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// デバッグ用: Xのトークンリフレッシュをテストする
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "twitter" },
  });

  if (!account) {
    return NextResponse.json({ error: "No twitter account found" });
  }

  const now = Math.floor(Date.now() / 1000);
  
  const debugInfo = {
    hasAccessToken: !!account.access_token,
    hasRefreshToken: !!account.refresh_token,
    expiresAt: account.expires_at,
    isExpired: account.expires_at ? account.expires_at < now : null,
    now,
    clientIdSet: !!process.env.TWITTER_CLIENT_ID,
    clientSecretSet: !!process.env.TWITTER_CLIENT_SECRET,
  };

  if (!account.refresh_token) {
    return NextResponse.json({ debugInfo, error: "No refresh token" });
  }

  // リフレッシュ試行
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  
  if (!clientId || !clientSecret) {
    return NextResponse.json({ debugInfo, error: "TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not set in environment" });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      return NextResponse.json({ debugInfo, refreshError: data });
    }

    // 成功したら保存
    const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in ?? 7200);
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? account.refresh_token,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({ 
      debugInfo, 
      success: true, 
      newExpiresAt: expiresAt,
      scope: data.scope
    });
  } catch (err: any) {
    return NextResponse.json({ debugInfo, error: err.message });
  }
}
