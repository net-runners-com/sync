import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 個別ワークフロー取得
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({
      where: { id, userId: session.user.id },
    });
    if (!workflow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Workflow GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

// ワークフロー削除
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await prisma.workflow.delete({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workflow DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}

// ワークフロー更新 (isPublic や isActive 等のトグル用)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    
    // 更新可能なフィールドを抽出
    const updateData: any = {};
    if (typeof body.isPublic === 'boolean') updateData.isPublic = body.isPublic;
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive;
    if (typeof body.name === 'string') updateData.name = body.name;
    if (typeof body.description === 'string') updateData.description = body.description;

    const updatedWorkflow = await prisma.workflow.update({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json(updatedWorkflow);
  } catch (error) {
    console.error("Workflow PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}
