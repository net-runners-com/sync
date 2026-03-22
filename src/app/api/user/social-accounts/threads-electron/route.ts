import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ElectronからThreads Cookieを受け取りDBに保存
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, dsUserId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionidが必要です" }, { status: 400 });
  }

  try {
    let username = "Threads User";
    let name = "Threads User";

    try {
      const res = await fetch("https://www.instagram.com/api/v1/accounts/current_user/?edit=true", {
        headers: {
          "Cookie": `sessionid=${sessionId}; ds_user_id=${dsUserId || ""}`,
        },
      });
      const data = await res.json();
      if (data?.user?.username) {
        username = data.user.username;
        name = data.user.full_name || username;
      }
    } catch (e) {
      console.warn("[Threads] Could not fetch user info", e);
    }

    const userId = dsUserId || `threads_${Date.now()}`;

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "threads", providerAccountId: userId } },
      update: { access_token: sessionId, scope: "cookie-auth" },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "threads",
        providerAccountId: userId,
        access_token: sessionId,
        scope: "cookie-auth",
        token_type: "cookie",
      },
    });

    return NextResponse.json({ success: true, username, name, userId });
  } catch (error: any) {
    console.error("[Threads] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
