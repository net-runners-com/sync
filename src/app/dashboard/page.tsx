"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Activity, Clock, MoreVertical, Trash2, Edit3, Loader2, PlayCircle, PlusCircle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ダミーデータ: 直近の実行ログ (本来はAPIから取得)
const recentExecutions = [
  { id: "e1", wfName: "毎朝のニュース要約", status: "success", time: "10分前", duration: "1.2s" },
  { id: "e2", wfName: "Instagram画像生成", status: "error", time: "1時間前", duration: "5.4s" },
  { id: "e3", wfName: "ユーザーへの自動返信", status: "success", time: "3時間前", duration: "0.8s" },
  { id: "e4", wfName: "週間レポート作成", status: "running", time: "実行中", duration: "-" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkflows(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateBlank = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新しいワークフロー", description: "", nodes: [], edges: [] }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/editor?id=${data.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="text-emerald-500" size={18} />;
      case "error": return <XCircle className="text-rose-500" size={18} />;
      case "running": return <Loader2 className="text-blue-500 animate-spin" size={18} />;
      default: return <Clock className="text-slate-400" size={18} />;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* 🚀 Minimalist AI Prompt Header */}
      <section className="w-full flex flex-col items-center justify-center py-12 md:py-20 relative">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight text-center mb-4">
          どんなワークフローを作りますか？
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-10 max-w-xl">
          AIアシスタントに作りたいものを伝えるだけで、複雑な自動化ワークフローが数秒で完成します。
        </p>
        
        <div className="w-full max-w-3xl relative group">
          <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl blur-xl transition-all group-focus-within:bg-blue-500/10 dark:group-focus-within:bg-blue-500/20" />
          <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm transition-all focus-within:shadow-md focus-within:border-blue-500/50 dark:focus-within:border-blue-500/50">
            <Sparkles className="text-slate-400 dark:text-slate-500 mx-3" size={24} />
            <input
              className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 text-lg px-2 py-4"
              placeholder="例: 毎朝ニュースを要約して投稿するボット..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <button className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 p-3 md:px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
              <span className="hidden md:inline">生成する</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 text-sm">
          <span className="text-slate-500">または</span>
          <button 
            onClick={handleCreateBlank}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
          >
            {creating ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={16} />}
            ゼロから作成する
          </button>
        </div>
      </section>

      {/* 📊 Content Grid (My Workflows & Activity) */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: My Workflows */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="text-blue-500" size={24} />
              マイワークフロー
            </h2>
            <Link href="/dashboard/projects" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              すべて見る →
            </Link>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-800 h-40 rounded-2xl" />
              ))
            ) : workflows.length === 0 ? (
              <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <PlusCircle className="text-slate-400" size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">最初のワークフローを作成</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">上のAIアシスト枠からプロンプトを入力して自動生成するか、空のキャンバスから始めましょう。</p>
                </div>
              </div>
            ) : (
              workflows.slice(0, 4).map((workflow) => (
                <div key={workflow.id} onClick={() => router.push(`/editor?id=${workflow.id}`)} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg hover:border-blue-500/50 dark:hover:border-blue-500/50 cursor-pointer transition-all relative overflow-hidden flex flex-col gap-4">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{workflow.name}</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      {workflow.isActive ? <span className="w-2 h-2 rounded-full bg-emerald-500" /> : <span className="w-2 h-2 rounded-full bg-slate-400" />}
                      {workflow.isActive ? 'Active' : 'Paused'}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                    {workflow.description || "説明がありません"}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto">
                    <span>最終更新: {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                    <button className="text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      編集 <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Activity & Schedule */}
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="text-purple-500" size={24} />
            最近のアクティビティ
          </h2>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">実行履歴</span>
              <button className="text-xs text-blue-600 dark:text-blue-400 font-medium">詳細を見る</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentExecutions.map((exec) => (
                <div key={exec.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       {getStatusIcon(exec.status)}
                       <span className="font-medium text-slate-900 dark:text-slate-200 text-sm truncate max-w-[150px]">{exec.wfName}</span>
                    </div>
                    <span className="text-xs text-slate-500">{exec.time}</span>
                  </div>
                  {exec.status !== "running" && (
                    <div className="flex items-center gap-3 text-xs pl-7">
                      <span className="text-slate-500">処理時間: <span className="text-slate-700 dark:text-slate-300">{exec.duration}</span></span>
                      {exec.status === "error" && <span className="text-rose-500">APIキー無効</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mt-4">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
             <div className="relative z-10 flex flex-col gap-3">
               <div className="flex items-center gap-2 text-blue-100 font-medium text-sm">
                 <Clock size={16} /> 次の予定タスク
               </div>
               <h3 className="text-xl font-bold">15:00 定期ツイート</h3>
               <p className="text-sm text-blue-100/80">あと 45分 で実行されます</p>
               <button className="mt-2 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors w-fit backdrop-blur-sm border border-white/10">
                 スケジュールを確認
               </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// 足りないアイコンのモック
const LayoutGrid = ({ className, size }: { className?: string, size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
);
