import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken, userID } = await request.json();
    if (!accessToken || !userID) {
      return NextResponse.json({ error: "Missing token or userID" }, { status: 400 });
    }

    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // 1. Exchange short-lived token for long-lived token
    const tokenParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: accessToken,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("[Facebook] Token exchange error:", tokenData.error);
      throw new Error(tokenData.error.message);
    }

    const longLivedToken = tokenData.access_token;
    // Facebook returns expires_in in seconds (usually ~60 days)
    const expiresIn = tokenData.expires_in || (60 * 60 * 24 * 60); 
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // 2. Fetch User Profile to get Name
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=name&access_token=${longLivedToken}`);
    const meData = await meRes.json();
    const accountName = meData.name || "Facebook Account";

    // 3. Upsert into database
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "facebook",
          providerAccountId: userID,
        },
      },
      create: {
        userId: session.user.id,
        type: "oauth",
        provider: "facebook",
        providerAccountId: userID,
        access_token: longLivedToken,
        expires_at: expiresAt,
        session_state: accountName,
      },
      update: {
        userId: session.user.id,
        access_token: longLivedToken,
        expires_at: expiresAt,
        session_state: accountName,
      },
    });

    return NextResponse.json({ success: true, name: accountName });
  } catch (error: any) {
    console.error("[Facebook] Auth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET method to safely provide App ID to the client-side JS SDK
export async function GET() {
  return NextResponse.json({ appId: process.env.FACEBOOK_CLIENT_ID || "" });
}
