import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // isPublic: true のワークフローを全て取得し、ユーザー情報を含めて返す
    const workflows = await prisma.workflow.findMany({
      where: {
        isPublic: true,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Market workflows GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch market workflows" }, { status: 500 });
  }
}
