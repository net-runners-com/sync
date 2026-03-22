import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ElectronからFacebook Cookieを受け取りDBに保存
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cUser, xs, datr } = await request.json();

  if (!cUser || !xs) {
    return NextResponse.json({ error: "c_userとxsが必要です" }, { status: 400 });
  }

  try {
    let username = "Facebook User";
    let name = "Facebook User";

    try {
      const res = await fetch("https://graph.facebook.com/me?fields=id,name", {
        headers: {
          "Cookie": `c_user=${cUser}; xs=${xs}; datr=${datr || ""}`,
        },
      });
      const data = await res.json();
      if (data?.name) {
        name = data.name;
        username = data.id;
      }
    } catch (e) {
      console.warn("[Facebook] Could not fetch user info", e);
    }

    const userId = cUser; // c_user がFacebookユーザーID

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "facebook", providerAccountId: userId } },
      update: { access_token: xs, refresh_token: datr, scope: "cookie-auth" },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "facebook",
        providerAccountId: userId,
        access_token: xs,
        refresh_token: datr,
        scope: "cookie-auth",
        token_type: "cookie",
      },
    });

    return NextResponse.json({ success: true, username: name, name, userId });
  } catch (error: any) {
    console.error("[Facebook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
