"use client";

import React, { useState, useEffect } from "react";
import { Download, Search, LayoutGrid, Loader2, User, Clock, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface PublicWorkflow {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  user: {
    name: string | null;
    image: string | null;
  };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<PublicWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/market/workflows");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWorkflows(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (id: string) => {
    setImportingId(id);
    try {
      const res = await fetch("/api/market/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      toast.success("インポートが完了しました！", {
        description: "マイプロジェクトから確認できます。"
      });
      router.push("/dashboard/projects");
    } catch (err) {
      console.error(err);
      toast.error("インポートに失敗しました。");
    } finally {
      setImportingId(null);
    }
  };

  const filtered = workflows.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutGrid className="text-blue-500" />
              テンプレートギャラリー
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              他のユーザーが作成したワークフローを見つけて、自分のプロジェクトにコピーしましょう
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ワークフローを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-2xl bg-slate-200/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">見つかりませんでした</h3>
              <p className="text-slate-500 text-sm">パブリックなワークフローがまだないか、検索条件に一致しません。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(workflow => (
                <div key={workflow.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col group">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{workflow.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 min-h-[60px]">
                      {workflow.description || "説明はありません"}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {workflow.user?.image ? (
                        <img src={workflow.user.image} alt="User" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User size={12} className="text-slate-400" />
                        </div>
                      )}
                      <span className="text-xs text-slate-600 font-medium">{workflow.user?.name || "ユーザー"}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock size={12} />
                        {timeAgo(workflow.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImport(workflow.id)}
                    disabled={importingId === workflow.id}
                    className="w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-blue-100 group-hover:border-transparent"
                  >
                    {importingId === workflow.id ? (
                      <><Loader2 size={16} className="animate-spin" /> インポート中...</>
                    ) : (
                      <><Download size={16} /> インポートする</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
