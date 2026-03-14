"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Instagram, Twitter, Play, Plus, MoreVertical, Trash2, Edit3, Clock, CheckCircle, PauseCircle, Loader2 } from "lucide-react";
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

function WorkflowCard({ workflow, onDelete }: { workflow: Workflow; onDelete: (id: string) => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`「${workflow.name}」を削除しますか？`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
      onDelete(workflow.id);
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  };

  return (
    <div
      className="group bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
      onClick={() => router.push(`/editor?id=${workflow.id}`)}
    >
      {/* カラーアクセント */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-600 w-full" />

      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-2 flex-1">{workflow.name}</h3>
          <div className="relative flex-shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={(e) => { e.stopPropagation(); router.push(`/editor?id=${workflow.id}`); setMenuOpen(false); }}
                >
                  <Edit3 size={14} /> 編集する
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  削除する
                </button>
              </div>
            )}
          </div>
        </div>

        {workflow.description && (
          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{workflow.description}</p>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            {workflow.isActive ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle size={11} /> 稼働中
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                <PauseCircle size={11} /> 停止中
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} /> {timeAgo(workflow.updatedAt)}
          </span>
        </div>
      </div>

      {/* ホバー時のオーバーレイ */}
      <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
  );
}

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

  const handleDelete = (id: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

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

  const templates = [
    { id: "t1", title: "毎日名言ボット (X推し)", desc: "毎朝8時に偉人の名言をテキスト生成し、X(Twitter)へ自動投稿します。", icon: Twitter, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "t2", title: "Instagram映え 画像生成", desc: "トレンドワードからDALL-E3で画像を生成し、Instagramへ自動投稿します。", icon: Instagram, color: "text-pink-500", bg: "bg-pink-50" },
    { id: "t3", title: "ブログ要約 → 動画化", desc: "RSSを読み取り、要約テキストからRunwayでショート動画を生成します。", icon: Play, color: "text-orange-500", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">新しいプロジェクトを作成</h1>
        <p className="text-slate-500 mt-2">AIアシスタントに作りたいフローを伝えるか、テンプレートから始めてください。</p>
      </header>

      {/* AI Assist Section */}
      <section className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-1 shadow-xl">
        <div className="bg-white/10 backdrop-blur-md rounded-[22px] p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-white">
            <Sparkles size={28} className="text-yellow-300" />
            <h2 className="text-xl font-bold">AIアシストでワークフローを自動生成</h2>
          </div>
          <div className="relative">
            <textarea
              className="w-full bg-white rounded-2xl p-6 pr-16 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-purple-400/50 resize-none h-32 shadow-inner text-lg"
              placeholder='例: 「毎朝9時にAIニュースを収集して、要約をTwitterとFacebookに画像付きで投稿するフローを作って」'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <button className="absolute bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition-transform hover:scale-105 shadow-lg flex items-center justify-center">
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Template Gallery */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">テンプレートギャラリー</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={handleCreateBlank}
            disabled={creating}
            className="group border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer min-h-[180px] disabled:opacity-60"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
              {creating ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
            </div>
            <div className="text-lg font-bold text-slate-700 group-hover:text-blue-700">空から作成</div>
          </button>
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer min-h-[180px]" onClick={handleCreateBlank}>
              <div className={`w-12 h-12 rounded-2xl ${tpl.bg} ${tpl.color} flex items-center justify-center`}>
                <tpl.icon size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">{tpl.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed flex-1">{tpl.desc}</p>
              <button className="mt-auto w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
                このテンプレートを使う
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
