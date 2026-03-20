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
        token_type: true,
        session_state: true,
        id_token: true,
      },
    });

    // プロバイダーごとに連携済みアカウントリストをまとめる
    const socialAccounts: Record<string, { accountId: string; accountName?: string; hasToken: boolean; scope?: string | null }[]> = {
      facebook: [],
      instagram: [],
      twitter: [],
      google: [],
      threads: [],
    };

    for (const account of accounts) {
      if (socialAccounts[account.provider]) {
        socialAccounts[account.provider].push({
          accountId: account.providerAccountId,
          accountName: account.session_state || undefined,
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

// 特定のSNSアカウント連携を削除する
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, providerAccountId } = await request.json();
    if (!provider || !providerAccountId) {
      return NextResponse.json({ error: "provider and providerAccountId are required" }, { status: 400 });
    }

    // 本人確認: 自分のアカウントのみ削除可能
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider, providerAccountId },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.account.delete({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Social Account DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
