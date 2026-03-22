import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Meta が signed_request を送ってくるのでパース＋検証する
function parseSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) return null;

  // base64url → base64
  const toBase64 = (s: string) => s.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (s.length % 4)) % 4);

  const sig = Buffer.from(toBase64(encodedSig), "base64");
  const data = JSON.parse(Buffer.from(toBase64(payload), "base64").toString("utf8"));

  // HMACで署名を検証
  const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    console.error("[DataDeletion] Signature mismatch");
    return null;
  }
  return data;
}

// Meta から呼ばれるデータ削除コールバック (POST)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      return NextResponse.json({ error: "signed_request is required" }, { status: 400 });
    }

    const appSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
    const data = parseSignedRequest(signedRequest, appSecret);

    if (!data) {
      return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
    }

    const fbUserId = data.user_id as string;
    if (!fbUserId) {
      return NextResponse.json({ error: "user_id not found in signed_request" }, { status: 400 });
    }

    // Facebook の providerAccountId でアカウントを検索してユーザーIDを特定
    const account = await prisma.account.findFirst({
      where: { provider: "facebook", providerAccountId: fbUserId },
      select: { userId: true },
    });

    let deleted = false;
    if (account?.userId) {
      // ユーザーに紐づく全データを削除
      await prisma.$transaction([
        prisma.executionLog.deleteMany({ where: { workflow: { userId: account.userId } } }),
        prisma.workflow.deleteMany({ where: { userId: account.userId } }),
        prisma.account.deleteMany({ where: { userId: account.userId } }),
        prisma.session.deleteMany({ where: { userId: account.userId } }),
        prisma.user.delete({ where: { id: account.userId } }),
      ]);
      deleted = true;
      console.log(`[DataDeletion] Deleted user data for Facebook userId: ${fbUserId}`);
    } else {
      console.log(`[DataDeletion] No user found for Facebook userId: ${fbUserId}`);
    }

    // Meta は confirmation_code と status_url を要求する
    const confirmationCode = crypto.randomBytes(16).toString("hex");
    const baseUrl = process.env.NEXTAUTH_URL || "https://yourdomain.com";

    return NextResponse.json({
      url: `${baseUrl}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
      deleted,
    });
  } catch (error) {
    console.error("[DataDeletion] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ユーザーが確認コードで削除状態を確認できる (GET)
export async function GET() {
  return NextResponse.json({
    message: "Data Deletion Request endpoint. Send POST with signed_request from Meta.",
    endpoint: "/api/auth/data-deletion",
  });
}
