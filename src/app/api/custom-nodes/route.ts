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

    const customNodes = await prisma.customNode.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(customNodes);
  } catch (error) {
    console.error("CustomNodes GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch custom nodes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, icon, isPublic, config } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newCustomNode = await prisma.customNode.create({
      data: {
        name,
        description: description || null,
        icon: icon || "Box",
        isPublic: isPublic ?? false,
        config: config ?? { inputs: [], outputs: [], type: "AI_PROMPT" },
        userId: session.user.id,
      },
    });

    return NextResponse.json(newCustomNode, { status: 201 });
  } catch (error) {
    console.error("CustomNodes POST Error:", error);
    return NextResponse.json({ error: "Failed to create custom node" }, { status: 500 });
  }
}
