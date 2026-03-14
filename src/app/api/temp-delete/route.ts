import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accountToDelete = "cmmqmbgf00002bqs85wmmhzxb";
    const res = await prisma.account.delete({
      where: { id: accountToDelete }
    });
    return NextResponse.json({ success: true, deleted: res });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
