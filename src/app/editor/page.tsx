"use client";

import React, { useState, useEffect, Suspense } from "react";
import WorkflowEditor from "./components/WorkflowEditor";
import Sidebar from "./components/Sidebar";
import { Button } from "@/components/ui/button";
import { ReactFlowProvider } from "@xyflow/react";
import { Settings, X, Loader2 } from "lucide-react";
import EditorHeader from "./components/EditorHeader";
import { useSearchParams } from "next/navigation";

// useSearchParams を使う内部コンポーネント（Suspenseが必要なため分離）
function EditorInner() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id");

  const [initialData, setInitialData] = useState<{
    id: string;
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  } | null>(null);
  const [loading, setLoading] = useState(!!workflowId);

  useEffect(() => {
    if (!workflowId) return;
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setInitialData({
            id: data.id,
            name: data.name,
            description: data.description || "",
            nodes: Array.isArray(data.nodes) ? data.nodes : [],
            edges: Array.isArray(data.edges) ? data.edges : [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [workflowId]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium">ワークフローを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <ReactFlowProvider>
        <Sidebar />

        <main className="flex-1 flex flex-col relative w-full h-full">
          <EditorHeader
            onOpenSettings={() => setIsSettingsOpen(true)}
            workflowId={initialData?.id ?? null}
            initialName={initialData?.name ?? "新しいワークフロー"}
          />

          <div className="flex-1 w-full h-full relative">
            <WorkflowEditor
              initialNodes={initialData?.nodes ?? []}
              initialEdges={initialData?.edges ?? []}
            />
          </div>
        </main>

        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-[500px] max-w-[90vw] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Settings size={18} className="text-slate-500" />
                  ワークフロー設定
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">ワークフロー名</label>
                  <input
                    type="text"
                    defaultValue={initialData?.name ?? "新しいワークフロー"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">説明</label>
                  <textarea
                    defaultValue={initialData?.description ?? ""}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none h-24"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <label className="text-sm font-semibold text-slate-700">ステータス</label>
                  <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer">
                    <option value="active">🟢 Active (有効)</option>
                    <option value="draft">⚪ Draft (下書き)</option>
                    <option value="paused">🟡 Paused (一時停止)</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                  キャンセル
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsSettingsOpen(false)}>
                  設定を保存
                </Button>
              </div>
            </div>
          </div>
        )}
      </ReactFlowProvider>
    </div>
  );
}

// Suspense でラップしてエクスポート
export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
          <Loader2 size={36} className="animate-spin text-blue-500" />
        </div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
