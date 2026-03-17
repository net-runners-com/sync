"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWorkflow?: (nodes: any[], edges: any[]) => void;
}

const CHAT_SYSTEM_PROMPT = `You are an AI assistant for "Sync", a visual SNS workflow automation tool. 
Help users design and optimize their workflows. You can:
- Suggest workflow structures based on their goals
- Explain how to connect nodes
- Provide tips for SNS posting strategies
- When asked to create/generate a workflow, respond with the JSON structure

Always respond in Japanese. Be concise and helpful.

Available node types: trigger, textAi (text generation), imageAi (image generation), videoAi (video generation), socialAction-x (X/Twitter), socialAction-instagram, socialAction-facebook, socialAction-threads, imageInput, videoInput, textInput, note (note.com)`;

export default function AiSidebar({ isOpen, onClose, onApplyWorkflow }: AiSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "こんにちは！Syncのワークフローアシスタントです✨\n\nワークフローの設計、ノードの使い方、SNS投稿の自動化についてお手伝いします。\n\n**例えばこんなことを聞いてみてください：**\n- 「毎日AIで画像を生成してXに投稿するフローを作って」\n- 「Instagram向けのリール投稿ワークフローが欲しい」\n- 「IfElseノードの使い方を教えて」",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingWorkflow, setGeneratingWorkflow] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: CHAT_SYSTEM_PROMPT,
        }),
      });

      if (!res.ok) throw new Error("AI応答に失敗しました");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      toast.error(e.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "エラーが発生しました。しばらくしてから再試行してください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateWorkflow = async () => {
    const text = input.trim();
    if (!text || generatingWorkflow) return;

    setGeneratingWorkflow(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: `ワークフローを生成して: ${text}` }]);

    try {
      const res = await fetch("/api/ai/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json();
      if (data.success && data.workflow) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ ワークフローを生成しました！\n\n**${data.workflow.nodes.length}個のノード**と**${data.workflow.edges.length}本の接続**からなるフローです。\n\n「フローを適用する」ボタンをクリックするとエディターに反映されます。`,
          },
        ]);
        onApplyWorkflow?.(data.workflow.nodes, data.workflow.edges);
        toast.success("ワークフローをエディターに適用しました！");
      } else {
        throw new Error(data.error || "生成に失敗しました");
      }
    } catch (e: any) {
      toast.error(e.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `エラー: ${e.message}` },
      ]);
    } finally {
      setGeneratingWorkflow(false);
    }
  };

  const renderMessage = (msg: Message, i: number) => {
    const isUser = msg.role === "user";
    return (
      <div key={i} className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
            <Bot size={14} className="text-white" />
          </div>
        )}
        <div
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm"
          }`}
        >
          {msg.content.split("\n").map((line, j) => {
            const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            return (
              <p key={j} className="mb-0.5" dangerouslySetInnerHTML={{ __html: bold }} />
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 w-[320px] flex-shrink-0">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="flex items-center gap-2 text-white">
          <Sparkles size={16} className="animate-pulse" />
          <span className="text-sm font-bold">AI アシスタント</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.map(renderMessage)}
        {(loading || generatingWorkflow) && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-violet-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {generatingWorkflow ? "ワークフロー生成中..." : "考え中..."}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 text-xs p-2 border border-slate-200 dark:border-slate-700 rounded-xl resize-none h-16 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-400"
            placeholder="質問する、またはフロー生成を依頼..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || generatingWorkflow}
            className="mb-0.5 p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white transition-colors flex-shrink-0"
          >
            {loading || generatingWorkflow
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
