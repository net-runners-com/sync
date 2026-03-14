"use client";

import React, { useState } from "react";
import { Sparkles, Image as ImageIcon, Send, Loader2, Copy, Check, ChevronDown } from "lucide-react";

const TEXT_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Meta) 🆓" },
  { id: "google/gemma-3-27b-it:free", label: "Gemma 3 27B (Google) 🆓" },
  { id: "google/gemma-3-12b-it:free", label: "Gemma 3 12B (Google) 🆓" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1 24B 🆓" },
  { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder 480B (Alibaba) 🆓" },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B (Nous) 🆓" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (NVIDIA) 🆓" },
  { id: "openai/gpt-oss-120b:free", label: "GPT OSS 120B (OpenAI) 🆓" },
  { id: "openai/gpt-oss-20b:free", label: "GPT OSS 20B (OpenAI) 🆓" },
  { id: "stepfun/step-3.5-flash:free", label: "Step 3.5 Flash (StepFun) 🆓" },
];

const IMAGE_MODELS = [
  { id: "openai/gpt-5-image-mini", label: "GPT-5 Image Mini (OpenAI)" },
  { id: "openai/gpt-5-image", label: "GPT-5 Image (OpenAI)" },
  { id: "google/gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image (Google)" },
  { id: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Google)" },
];

export default function AITestPage() {
  const [tab, setTab] = useState<"text" | "image">("text");
  const [prompt, setPrompt] = useState("");
  const [textModel, setTextModel] = useState(TEXT_MODELS[0].id);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: string; result: string; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          prompt,
          model: tab === "text" ? textModel : imageModel,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.result) {
      navigator.clipboard.writeText(result.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
      {/* ヘッダー */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Sparkles size={28} className="text-purple-500" />
          AI テスト
        </h1>
        <p className="text-slate-500 mt-1">OpenRouter の無料モデルでテキスト・画像生成を試せます</p>
      </header>

      {/* タブ */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("text")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles size={15} />
          テキスト生成
        </button>
        <button
          onClick={() => setTab("image")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "image" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ImageIcon size={15} />
          画像生成
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* モデル選択 */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center gap-3">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap">モデル</label>
          <div className="relative w-full max-w-xs">
            <select
              className="w-full appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/40 cursor-pointer"
              value={tab === "text" ? textModel : imageModel}
              onChange={(e) => tab === "text" ? setTextModel(e.target.value) : setImageModel(e.target.value)}
            >
              {(tab === "text" ? TEXT_MODELS : IMAGE_MODELS).map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* プロンプト入力 */}
        <div className="p-6 flex flex-col gap-4">
          <div className="relative">
            <textarea
              className="w-full px-5 py-4 pr-16 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/40 resize-none h-36 bg-slate-50 placeholder-slate-400"
              placeholder={
                tab === "text"
                  ? "例: 「日本のAIスタートアップの最新トレンドについて300文字で要約してください」"
                  : "例: 「サイバーパンクな東京の夜景、高層ビル、ネオンライト」"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="absolute bottom-4 right-4 w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-md"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-400">⌘+Enter で送信</p>
        </div>

        {/* 結果表示 */}
        {(result || error || loading) && (
          <div className="border-t border-slate-100 p-6">
            {loading && (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 size={20} className="animate-spin text-purple-500" />
                <span className="text-sm">生成中...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                <span className="font-bold">エラー: </span>{error}
              </div>
            )}

            {result && !loading && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-lg">
                    {result.model}
                  </span>
                  {result.type === "text" && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                      {copied ? "コピーしました" : "コピー"}
                    </button>
                  )}
                </div>

                {result.type === "text" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[100px]">
                    {result.result}
                  </div>
                )}

                {(result.type === "image" || result.type === "image_b64") && (
                  <div className="flex flex-col gap-2">
                    <img
                      src={result.result}
                      alt="Generated"
                      className="rounded-xl border border-slate-200 max-w-full shadow-sm"
                    />
                    {result.type === "image" && (
                      <a
                        href={result.result}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        画像を別タブで開く
                      </a>
                    )}
                  </div>
                )}

                {result.type === "image_text" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    <p className="text-xs text-amber-600 mb-2 font-semibold">⚠ モデルのレスポンス（画像URL形式では返されませんでした）</p>
                    {result.result}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
