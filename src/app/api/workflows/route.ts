import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 新しいワークフローの作成、または既存の更新
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, description, nodes, edges, folder } = await request.json();

    if (id) {
      // 既存ワークフローの更新
      const updated = await prisma.workflow.update({
        where: { id: id, userId: session.user.id },
        data: { name, description, nodes, edges, folder: folder ?? undefined },
      });
      return NextResponse.json(updated);
    } else {
      // 新規作成
      const created = await prisma.workflow.create({
        data: {
          userId: session.user.id,
          name: name || "名称未設定フロー",
          description: description || "",
          nodes: nodes || [],
          edges: edges || [],
          folder: folder || null,
        },
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error("Workflow Save Error:", error);
    return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
  }
}

// ユーザーのワークフロー一覧取得
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });
    
    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Workflow Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}
