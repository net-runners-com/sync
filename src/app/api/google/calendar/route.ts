import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// Googleカレンダーのイベント一覧を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DBからGoogleアカウントのアクセストークンを取得
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "Googleアカウントが連携されていません。Googleでログインしてください。" },
        { status: 403 }
      );
    }

    // 今日から1ヶ月先までのイベントを取得
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "20",
    });

    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const error = await res.json();
      console.error("Google Calendar API error:", error);
      
      // トークンが期限切れの場合
      if (res.status === 401) {
        return NextResponse.json(
          { error: "Googleトークンが期限切れです。再度Googleでログインしてください。" },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: "Googleカレンダーの取得に失敗しました。" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const events = (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "(タイトルなし)",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
      location: event.location,
      htmlLink: event.htmlLink,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Google Calendar GET Error:", error);
    return NextResponse.json(
      { error: "Googleカレンダーの取得に失敗しました。" },
      { status: 500 }
    );
  }
}
