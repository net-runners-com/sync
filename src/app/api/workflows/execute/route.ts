import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { runWorkflow } from "@/lib/workflow-executor";

// バックグラウンドでローカルPC上で直接ワークフローを実行する
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
    }

    // Inngestを使わず、ローカルPCのバックグラウンドとして非同期で実行を開始する
    // awaitせずに実行を投げることで、Next.jsインスタンス上でバックグラウンド動作します
    runWorkflow(workflowId, session.user.id).catch((err) => {
      console.error("[Background Workflow Error]", err);
    });

    return NextResponse.json({ success: true, message: "Workflow background execution started" });
  } catch (error) {
    console.error("Workflow Execution Error:", error);
    return NextResponse.json({ error: "Failed to start workflow" }, { status: 500 });
  }
}
