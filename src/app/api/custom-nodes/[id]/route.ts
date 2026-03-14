import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    
    // 自分のノード、もしくは公開されているノードを取得可能にする
    const customNode = await prisma.customNode.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { isPublic: true }
        ]
      },
      include: {
        user: { select: { name: true, image: true } }
      }
    });

    if (!customNode) {
      return NextResponse.json({ error: "Not found or not accessible" }, { status: 404 });
    }
    return NextResponse.json(customNode);
  } catch (error) {
    console.error("CustomNode GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch custom node" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    // 更新は作成者のみ
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.config !== undefined) updateData.config = body.config;

    const updatedNode = await prisma.customNode.update({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json(updatedNode);
  } catch (error) {
    console.error("CustomNode PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update custom node" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // 削除は作成者のみ
    await prisma.customNode.delete({
      where: { id, userId: session.user.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CustomNode DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete custom node" }, { status: 500 });
  }
}
