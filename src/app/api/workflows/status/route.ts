import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * ユーザーの全ワークフロー + 最新の実行ログを返す
 */
export async function GET() {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflows = await prisma.workflow.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      logs: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  return NextResponse.json(workflows);
}
