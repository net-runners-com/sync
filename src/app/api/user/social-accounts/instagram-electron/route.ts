import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Electronから受け取ったInstagramのCookieをDBに保存
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, dsUserId, csrftoken } = await request.json();

  if (!sessionId || !dsUserId) {
    return NextResponse.json({ error: "sessionidとds_user_idが必要です" }, { status: 400 });
  }

  try {
    let username = "Instagram User";
    let name = "Instagram User";

    // Instagram Graph API でユーザー情報取得を試みる
    try {
      const res = await fetch("https://www.instagram.com/api/v1/accounts/current_user/?edit=true", {
        headers: {
          "Cookie": `sessionid=${sessionId}; ds_user_id=${dsUserId}; csrftoken=${csrftoken || ""}`,
          "X-CSRFToken": csrftoken || "",
        },
      });
      const data = await res.json();
      if (data?.user?.username) {
        username = data.user.username;
        name = data.user.full_name || username;
      }
    } catch (e) {
      console.warn("[Instagram] Could not fetch user info", e);
    }

    const userId = dsUserId;

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "instagram", providerAccountId: userId } },
      update: { access_token: sessionId, refresh_token: csrftoken, scope: "cookie-auth" },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "instagram",
        providerAccountId: userId,
        access_token: sessionId,
        refresh_token: csrftoken,
        scope: "cookie-auth",
        token_type: "cookie",
      },
    });

    return NextResponse.json({ success: true, username, name, userId });
  } catch (error: any) {
    console.error("[Instagram] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
