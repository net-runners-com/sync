import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ワークフローのスケジュール取得
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId: session.user.id },
      select: {
        id: true,
        name: true,
        isScheduled: true,
        schedule: true,
        nextRunAt: true,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ schedule: workflow });
  } catch (error) {
    console.error("Schedule GET Error:", error);
    return NextResponse.json({ error: "Failed to get schedule" }, { status: 500 });
  }
}

// ワークフローのスケジュール設定・更新
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId, isScheduled, schedule, nextRunAt } = await req.json();

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
    }

    // 所有者チェック
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId: session.user.id },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }

    // スケジュール更新
    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        isScheduled: isScheduled ?? false,
        schedule: schedule || null,
        nextRunAt: nextRunAt ? new Date(nextRunAt) : null,
      },
      select: {
        id: true,
        name: true,
        isScheduled: true,
        schedule: true,
        nextRunAt: true,
      },
    });

    return NextResponse.json({ schedule: updated });
  } catch (error) {
    console.error("Schedule POST Error:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
