import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await req.json();

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
    }

    // 公開設定になっている元ワークフローを取得
    const originalWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!originalWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (!originalWorkflow.isPublic) {
      return NextResponse.json({ error: "This workflow is not public" }, { status: 403 });
    }

    // コピーとして新しいワークフローを作成
    const newWorkflow = await prisma.workflow.create({
      data: {
        name: `${originalWorkflow.name} (Copy)`,
        description: originalWorkflow.description,
        nodes: originalWorkflow.nodes ?? [],
        edges: originalWorkflow.edges ?? [],
        isActive: false,  // インポート直後は安全のため未稼働にする
        isPublic: false,  // 非公開状態にする
        userId: session.user.id,
      },
    });

    return NextResponse.json(newWorkflow, { status: 201 });
  } catch (error) {
    console.error("Market import Error:", error);
    return NextResponse.json({ error: "Failed to import workflow" }, { status: 500 });
  }
}
