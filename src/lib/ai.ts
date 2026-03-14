import OpenAI from "openai";

// OpenRouter経由でのテキスト生成
export async function generateTextWithAI(prompt: string, model: string = "openai/gpt-4o-mini", customApiKey?: string) {
  // baseUrl を OpenRouter に向けることで、openai パッケージをそのまま利用可能
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: customApiKey || process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", // アプリのURL
      "X-Title": "Sync", // アプリ名
    }
  });

  const response = await openai.chat.completions.create({
    model: model, // 例: "anthropic/claude-3.5-sonnet", "google/gemini-pro" などが指定可能
    messages: [{ role: "user", content: prompt }],
  });
  
  return response.choices[0].message.content;
}

// OpenRouter経由の画像生成 (現状OpenRouterはDALL-E等の画像生成APIに非対応の部分が多いため、必要に応じて別のプロバイダを利用します)
// ここでは、互換性のために形式だけ残すか、テキスト生成モデル(マルチモーダル等)にフォールバックさせる等のハンドリングが必要ですが、
// 一旦OpenAI DALL-E 3の標準エンドポイントをそのままフォールバックとして残しておきます。
export async function generateImageWithOpenAI(prompt: string, customApiKey?: string) {
  const openai = new OpenAI({ apiKey: customApiKey || process.env.OPENAI_API_KEY });
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
  });
  return response.data?.[0]?.url;
}
