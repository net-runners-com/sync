import OpenAI from "openai";

const FREE_TEXT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-12b-it:free",
  "openai/gpt-oss-20b:free"
];

// OpenRouter経由でのテキスト生成 (フォールバック対応)
export async function generateTextWithAI(prompt: string, model: string = "meta-llama/llama-3.3-70b-instruct:free", customApiKey?: string) {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: customApiKey || process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Sync",
    }
  });

  const modelQueue = [model, ...FREE_TEXT_MODELS.filter(m => m !== model)];
  let lastError: any;

  for (const m of modelQueue) {
    try {
      const response = await openai.chat.completions.create({
        model: m,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content;
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      // 429(レートリミット), 503(サーバーエラー), 404(モデルなし), 402(クレジット不足) はフォールバックする
      if (status === 429 || status === 503 || status === 404 || status === 402) {
        console.warn(`[AI TextGen] Model ${m} failed with ${status}, trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
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
