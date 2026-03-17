import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * note Unofficial API を使って記事を投稿する
 * POST body: { title, body, hashtags, status }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionToken = process.env.NOTE_SESSION_TOKEN;
  if (!sessionToken) {
    return NextResponse.json(
      { error: "NOTE_SESSION_TOKENが設定されていません。.envに追加してください。" },
      { status: 500 }
    );
  }

  const { title, body, hashtags, status } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "タイトルと本文は必須です" }, { status: 400 });
  }

  const hashtagList = hashtags
    ? hashtags.split(/[\s,]+/).filter(Boolean).map((t: string) => t.replace(/^#/, ""))
    : [];

  try {
    // note Unofficial API エンドポイント (v1)
    const res = await fetch("https://note.com/api/v1/text_notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `note_session_v5=${sessionToken}`,
        "User-Agent": "Mozilla/5.0",
        Origin: "https://note.com",
        Referer: "https://note.com/",
      },
      body: JSON.stringify({
        name: title,
        body: body,
        draft: status === "draft",
        hashtag_list: hashtagList,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[note] API error:", res.status, errText);
      return NextResponse.json(
        { error: `note APIエラー (${res.status}): セッショントークンを確認してください。` },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[note] fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
