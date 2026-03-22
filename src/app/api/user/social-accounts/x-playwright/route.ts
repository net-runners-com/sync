import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Electronフロントエンドから受け取ったCookieをDBに保存するシンプルなエンドポイント
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { cookies } = body;

  if (!cookies || !cookies.authToken || !cookies.ct0) {
    return NextResponse.json({ error: "Cookieが不足しています" }, { status: 400 });
  }

  const authToken = cookies.authToken;
  const ct0 = cookies.ct0;

  try {
    let userId = `x_${Date.now()}`;
    let username = "X User";
    let name = "X User";

    // ✅ twid から numeric userId を抽出 (例: u%3D1234567890 -> 1234567890)
    if (cookies.twid) {
      const decodedTwid = decodeURIComponent(cookies.twid);
      if (decodedTwid.startsWith('u=')) {
        userId = decodedTwid.replace('u=', '');
      } else {
        userId = decodedTwid;
      }
    }

    // X API (v2) でユーザー情報を取得（既存処理 - クッキーのみでは403になりがちですがフォールバックとして残します）
    try {
      const meRes = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=id,name,username",
        {
          headers: {
            "x-csrf-token": ct0,
            "content-type": "application/json",
            "Cookie": `auth_token=${authToken}; ct0=${ct0}`,
          },
        }
      );
      const meData = await meRes.json();
      if (meData?.data?.id) {
        userId = meData.data.id;
        username = meData.data.username ?? username;
        name = meData.data.name ?? name;
      }
    } catch (e) {
      console.warn("[X-Login] Could not fetch user info, saving cookies anyway", e);
    }

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
    console.error("[X-Login] Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
