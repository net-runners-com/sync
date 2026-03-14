import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// フォールバック順の無料モデルリスト（混雑時に順番に試す）
const FREE_TEXT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-12b-it:free",
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "stepfun/step-3.5-flash:free",
];

function makeClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Sync",
    },
  });
}

// レートリミット時に別モデルで自動リトライ
async function generateWithFallback(prompt: string, preferredModel: string) {
  const client = makeClient();

  // 指定モデルをリストの先頭に持ってきてフォールバック順を組む
  const modelQueue = [
    preferredModel,
    ...FREE_TEXT_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: any;
  for (const model of modelQueue) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
      });
      return { result: response.choices[0].message.content, model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      // 429 or 503 → 次のモデルへ
      if (status === 429 || status === 503 || status === 404) {
        console.warn(`[AI] ${model} → ${status}, 次のモデルを試します...`);
        continue;
      }
      // それ以外のエラーはすぐ投げる
      throw err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // --- 【変更箇所】API実行回数の制限 ---
    const MAX_EXECUTIONS = user.plan === "PRO" ? 100 : user.plan === "ENTERPRISE" ? Infinity : 3;
    if (user.monthlyExecutions >= MAX_EXECUTIONS) {
      return NextResponse.json(
        { error: `実行制限（月間${MAX_EXECUTIONS}回）に達しました。プランをアップグレードしてください。` },
        { status: 403 }
      );
    }

    const { type, prompt, model } = await request.json();

    let responseData = null;

    if (type === "text") {
      const preferred = model || FREE_TEXT_MODELS[0];
      const { result, model: usedModel } = await generateWithFallback(prompt, preferred);
      responseData = { type: "text", result, model: usedModel };
    } else if (type === "image") {
      const selectedModel = model || "openai/gpt-5-image-mini";

      const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Sync",
        },
        body: JSON.stringify({ model: selectedModel, prompt, n: 1 }),
      });

      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message || `Image generation failed (${res.status})` },
          { status: res.status }
        );
      }

      const imageData = data?.data?.[0];
      if (imageData?.url) {
        responseData = { type: "image", result: imageData.url, model: selectedModel };
      } else if (imageData?.b64_json) {
        responseData = {
          type: "image_b64",
          result: `data:image/png;base64,${imageData.b64_json}`,
          model: selectedModel,
        };
      } else {
        return NextResponse.json({ error: "No image data returned" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // --- 【追加箇所】実行回数をインクリメント ---
    if (responseData) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          monthlyExecutions: { increment: 1 }
        }
      });
      return NextResponse.json(responseData);
    }
    
    return NextResponse.json({ error: "Unhandled internal logic" }, { status: 500 });
  } catch (error: any) {
    console.error("AI Generate Error:", error);
    const msg = error?.status === 429
      ? "すべての無料モデルがレートリミット中です。しばらく待ってから再試行してください。"
      : error?.message || "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
