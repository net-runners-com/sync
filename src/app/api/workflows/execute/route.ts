import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { inngest } from "@/inngest/client";

// Inngestにイベントを送信し、ワークフローをバックグラウンド実行する
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

    // イベントパブリッシュ
    await inngest.send({
      name: "app/workflow.execute",
      data: {
        workflowId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Workflow execution started" });
  } catch (error) {
    console.error("Workflow Execution Error:", error);
    return NextResponse.json({ error: "Failed to start workflow" }, { status: 500 });
  }
}
