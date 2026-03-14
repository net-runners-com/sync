import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ユーザーが連携しているSNSアカウントの一覧と状態を返す
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        provider: true,
        providerAccountId: true,
        access_token: true,
        scope: true,
      },
    });

    // プロバイダーごとに連携済みアカウントリストをまとめる
    const socialAccounts: Record<string, { accountId: string; hasToken: boolean; scope?: string | null }[]> = {
      facebook: [],
      instagram: [],
      twitter: [],
      google: [],
    };

    for (const account of accounts) {
      if (socialAccounts[account.provider]) {
        socialAccounts[account.provider].push({
          accountId: account.providerAccountId,
          hasToken: !!account.access_token,
          scope: account.scope,
        });
      }
    }

    return NextResponse.json({ accounts: socialAccounts });
  } catch (error) {
    console.error("Social Accounts GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch social accounts" }, { status: 500 });
  }
}
