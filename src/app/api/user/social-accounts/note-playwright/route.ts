import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allCookies } = await request.json();

  if (!allCookies || Object.keys(allCookies).length === 0) {
    return NextResponse.json(
      { error: "Cookieデータが必要です" },
      { status: 400 }
    );
  }

  try {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "note" },
    });

    const providerAccountId = existingAccount?.providerAccountId || `note_${Date.now()}`;
    const cookieString = JSON.stringify(allCookies);

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "note", providerAccountId } },
      update: { refresh_token: cookieString, scope: "cookie-auth" },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "note",
        providerAccountId: providerAccountId,
        refresh_token: cookieString,
        scope: "cookie-auth",
        token_type: "cookie",
      },
    });

    return NextResponse.json({ success: true, username: "note User", name: "note User", userId: providerAccountId });
  } catch (error: any) {
    console.error("[Note-Login] Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
