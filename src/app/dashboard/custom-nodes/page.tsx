"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Box, Loader2, Globe, Lock, Search, Play } from "lucide-react";
import { useRouter } from "next/navigation";

interface CustomNode {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isPublic: boolean;
  updatedAt: string;
  config: any;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

export default function CustomNodesPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const res = await fetch("/api/custom-nodes");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNodes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const res = await fetch("/api/custom-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新規カスタムノード",
          description: "新しいカスタムノードの説明",
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      router.push(`/dashboard/custom-nodes/edit/${data.id}`);
    } catch (error) {
      console.error(error);
      alert("カスタムノードの作成に失敗しました");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/custom-nodes/${id}`, { method: "DELETE" });
      setNodes(nodes.filter(n => n.id !== id));
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublic = async (node: CustomNode) => {
    try {
      const res = await fetch(`/api/custom-nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !node.isPublic }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setNodes(nodes.map(n => n.id === node.id ? { ...n, isPublic: !n.isPublic } : n));
    } catch (error) {
      console.error(error);
      alert("公開設定の変更に失敗しました");
    }
  };

  const filtered = nodes.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n.description && n.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Box className="text-purple-500" />
              マイカスタムノード
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              独自のAIプロンプトやAPIをカプセル化して、一つのノードとして使い回そう
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="ノードを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-slate-50"
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
            >
              <Plus size={18} />
              新規作成
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>ノードを読み込み中...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Box size={24} className="text-purple-500" />
              </div>
              <h3 className="text-slate-900 font-bold mb-2">カスタムノードがありません</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                独自の機能をまとめたカスタムノードを作ると、ワークフロー上で何度でも再利用できるようになります。
              </p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
              >
                <Plus size={18} /> 最初の一つを作る
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(node => (
                <div key={node.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col group relative">
                  
                  {/* Public Badge */}
                  {node.isPublic && (
                    <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm flex items-center gap-1 z-10">
                      <Globe size={10} /> 公開中
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-100 flex-shrink-0">
                      {node.icon === 'Play' ? <Play size={20} className="text-purple-600" /> : <Box size={20} className="text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{node.name}</h3>
                      <p className="text-xs text-slate-400">更新: {timeAgo(node.updatedAt)}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                    {node.description || "説明がありません"}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/dashboard/custom-nodes/edit/${node.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit3 size={14} /> 編集
                    </button>
                    
                    <button
                      onClick={() => togglePublic(node)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        node.isPublic 
                          ? "bg-blue-50 hover:bg-blue-100 text-blue-700" 
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {node.isPublic ? <><Globe size={14} /> 公開中</> : <><Lock size={14} /> 非公開</>}
                    </button>

                    <button
                      onClick={() => handleDelete(node.id, node.name)}
                      disabled={deletingId === node.id}
                      className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors ml-auto"
                    >
                      {deletingId === node.id ? <Loader2 size={16} className="animate-spin text-red-600" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
