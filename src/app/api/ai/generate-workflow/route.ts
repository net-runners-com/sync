import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const WORKFLOW_SYSTEM_PROMPT = `You are a workflow builder assistant for "Sync", an SNS automation tool using node-based workflows.

Available node types and their descriptions:
- trigger: The starting point. Has a schedule (datetime).
- textAi: AI text generation (LLM). Has a "prompt" field.
- imageAi: AI image generation. Has a "prompt" field.
- videoAi: AI video generation. Has a "prompt" field.
- socialAction-x: Post to X (Twitter). platform=x
- socialAction-instagram: Post to Instagram. platform=instagram
- socialAction-facebook: Post to Facebook. platform=facebook
- socialAction-threads: Post to Threads. platform=threads
- imageInput: Provide a static image URL input.
- videoInput: Provide a static video URL input.
- textInput: Provide static text input.
- note: Post to note.com (Japanese blogging platform).

Based on the user's request, create a workflow as a JSON object with "nodes" and "edges" arrays in React Flow format.

Rules:
- Each node must have: id (string), type (string from above list), position ({x, y}), data (object with label)
- Each edge must have: id, source (node id), target (node id)
- Arrange nodes vertically (top to bottom), each node 150px apart.
- Start x at 300, start y at 50.
- Return ONLY valid JSON, no markdown, no explanation.

Example output for "Generate AI text and post to X":
{
  "nodes": [
    {"id":"1","type":"trigger","position":{"x":300,"y":50},"data":{"label":"スタート"}},
    {"id":"2","type":"textAi","position":{"x":300,"y":200},"data":{"label":"AIテキスト生成","prompt":""}},
    {"id":"3","type":"socialAction-x","position":{"x":300,"y":350},"data":{"label":"Xに投稿","platform":"x"}}
  ],
  "edges": [
    {"id":"e1-2","source":"1","target":"2"},
    {"id":"e2-3","source":"2","target":"3"}
  ]
}`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "プロンプトを入力してください" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY が設定されていません" }, { status: 500 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
        messages: [
          { role: "system", content: WORKFLOW_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `LLM API error: ${err}` }, { status: 500 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // JSON を抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "ワークフローの生成に失敗しました。もう少し具体的に説明してみてください。" }, { status: 500 });
    }

    const workflow = JSON.parse(jsonMatch[0]);

    if (!workflow.nodes || !workflow.edges) {
      return NextResponse.json({ error: "生成されたワークフローの形式が正しくありません" }, { status: 500 });
    }

    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    console.error("[generate-workflow]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
