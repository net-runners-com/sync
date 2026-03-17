"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import WorkflowEditor from "./components/WorkflowEditor";
import Sidebar from "./components/Sidebar";
import AiSidebar from "./components/AiSidebar";
import { Button } from "@/components/ui/button";
import { ReactFlowProvider } from "@xyflow/react";
import { Settings, X, Loader2, Sparkles } from "lucide-react";
import EditorHeader from "./components/EditorHeader";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

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

  // AIサイドバー
  const [isAiOpen, setIsAiOpen] = useState(false);
  // ワークフローをAI生成で上書きするコールバック
  const [aiGeneratedWorkflow, setAiGeneratedWorkflow] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  const handleApplyWorkflow = useCallback((nodes: any[], edges: any[]) => {
    setAiGeneratedWorkflow({ nodes, edges });
  }, []);

  // 実行状態管理
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingNodeIds, setExecutingNodeIds] = useState<string[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);

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
          setCurrentWorkflowId(data.id);
        }
      })
      .finally(() => setLoading(false));
  }, [workflowId]);

  // 実行ハイライトシミュレーション: ノードを順番にハイライト
  const simulateExecution = async (nodes: any[], edges: any[]) => {
    setIsExecuting(true);
    setCompletedNodeIds([]);
    setExecutingNodeIds([]);

    // エッジからノードの実行順序を計算（トポロジカル順）
    const nodeOrder = getTopologicalOrder(nodes, edges);

    for (const nodeId of nodeOrder) {
      setExecutingNodeIds([nodeId]);
      await new Promise((r) => setTimeout(r, 800));
      setCompletedNodeIds((prev) => [...prev, nodeId]);
      setExecutingNodeIds([]);
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsExecuting(false);
  };

  // シンプルなトポロジカルソート
  const getTopologicalOrder = (nodes: any[], edges: any[]): string[] => {
    const result: string[] = [];
    const visited = new Set<string>();
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};

    // 初期化
    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });
    edges.forEach((e) => {
      if (adj[e.source] && inDegree[e.target] !== undefined) {
        adj[e.source].push(e.target);
        inDegree[e.target]++;
      }
    });

    // 入力度0のノードをキューに
    const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      result.push(cur);
      (adj[cur] || []).forEach((next) => {
        inDegree[next]--;
        if (inDegree[next] === 0) queue.push(next);
      });
    }
    return result;
  };

  const handleExecute = async (wfId: string | null, nodes: any[], edges: any[]) => {
    if (!wfId) {
      toast.error("先にワークフローを保存してください");
      return;
    }

    // ビジュアルシミュレーション開始（APIと並行）
    simulateExecution(nodes, edges);

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: wfId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("ワークフローを実行しました", {
          description: data.generatedText ? `生成: ${data.generatedText.slice(0, 60)}...` : undefined,
        });
      } else {
        toast.error("実行に失敗しました", {
          description: data.error || "SNSノードがないか、連携が必要です",
        });
      }
    } catch (err) {
      toast.error("実行中にエラーが発生しました");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-slate-400">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium">ワークフローを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <ReactFlowProvider>
        <Sidebar />

        <main className="flex-1 flex flex-col relative w-full h-full min-w-0">
          <EditorHeader
            onOpenSettings={() => setIsSettingsOpen(true)}
            workflowId={initialData?.id ?? null}
            initialName={initialData?.name ?? "新しいワークフロー"}
            onExecute={handleExecute}
            isExecuting={isExecuting}
          />

          <div className="flex flex-1 w-full h-full relative overflow-hidden">
            <div className="flex-1 w-full h-full relative">
              <WorkflowEditor
                initialNodes={aiGeneratedWorkflow?.nodes ?? initialData?.nodes ?? []}
                initialEdges={aiGeneratedWorkflow?.edges ?? initialData?.edges ?? []}
                isExecuting={isExecuting}
                executingNodeIds={executingNodeIds}
                completedNodeIds={completedNodeIds}
              />
            </div>

            <AiSidebar
              isOpen={isAiOpen}
              onClose={() => setIsAiOpen(false)}
              onApplyWorkflow={handleApplyWorkflow}
            />
          </div>

          {/* AIボタン (右下フローティング) */}
          {!isAiOpen && (
            <button
              onClick={() => setIsAiOpen(true)}
              className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 animate-in fade-in"
            >
              <Sparkles size={14} className="animate-pulse" />
              AI アシスト
            </button>
          )}
        </main>

        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-[500px] max-w-[90vw] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Settings size={18} className="text-slate-500" />
                  ワークフロー設定
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">ワークフロー名</label>
                  <input
                    type="text"
                    defaultValue={initialData?.name ?? "新しいワークフロー"}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">説明</label>
                  <textarea
                    defaultValue={initialData?.description ?? ""}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none h-24 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-3">
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
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 size={36} className="animate-spin text-blue-500" />
        </div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
