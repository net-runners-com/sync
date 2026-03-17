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
  const [aiGeneratedWorkflow, setAiGeneratedWorkflow] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const handleApplyWorkflow = useCallback((nodes: any[], edges: any[]) => {
    setAiGeneratedWorkflow({ nodes, edges });
  }, []);

  // 実行状態管理
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingNodeIds, setExecutingNodeIds] = useState<string[]>([]);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [failedNodeIds, setFailedNodeIds] = useState<string[]>([]);
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

    setFailedNodeIds([]);
    simulateExecution(nodes, edges);

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: wfId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("実行開始に失敗しました", { description: data.error });
        setIsExecuting(false);
        return;
      }

      toast.info("ワークフローを開始しました...", { description: "完了を確認中です" });

      // ポーリングで実行結果を確認 (10秒以内, 2秒毎に5回目尋)
      let attempts = 0;
      const poll = async (): Promise<void> => {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
        try {
          const statusRes = await fetch("/api/workflows/status");
          if (!statusRes.ok) return;
          const wfList: any[] = await statusRes.json();
          const wf = wfList.find((w: any) => w.id === wfId);
          if (!wf) return;
          const latestLog = wf.logs?.[0];
          if (!latestLog) { if (attempts < 6) await poll(); return; }

          if (latestLog.status === "RUNNING") {
            if (attempts < 6) await poll();
            return;
          }

          const results: any[] = latestLog.details?.postResult || [];
          const failed = results.filter((r: any) => !r.success);
          const allOk = failed.length === 0 && results.length > 0 || results.some((r: any) => r.success);
          const isSnsOnly = results.length === 1 && results[0].platform === "none";

          if (latestLog.status === "SUCCESS" || isSnsOnly) {
            toast.success("実行完了✅", {
              description: isSnsOnly
                ? "コンテンツ生成完了（SNSノードなし）"
                : `投稿成功: ${results.filter((r: any) => r.success).map((r: any) => r.platform).join(", ")}`,
              duration: 5000,
            });
          } else if (latestLog.status === "FAILED") {
            const errMsg = latestLog.details?.errorSummary || latestLog.details?.error ||
              failed.map((f: any) => `${f.platform}: ${f.error}`).join(" / ") || "実行失敗";

            toast.error("実行失敗 ❌", {
              description: errMsg,
              duration: 8000,
            });

            // SNSノードを赤ハイライトに (platformが分からないことが多いので全SNSノード)
            const snsNodeIds = nodes
              .filter((n: any) => n.type === "socialActionNode")
              .map((n: any) => n.id);
            setFailedNodeIds(snsNodeIds);
          }

          setIsExecuting(false);
          setExecutingNodeIds([]);
        } catch {
          if (attempts < 6) await poll();
        }
      };
      poll();
    } catch (err) {
      toast.error("実行中にエラーが発生しました");
      setIsExecuting(false);
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
            onToggleAi={() => setIsAiOpen((v) => !v)}
            isAiOpen={isAiOpen}
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
                failedNodeIds={failedNodeIds}
              />
            </div>

            <AiSidebar
              isOpen={isAiOpen}
              onClose={() => setIsAiOpen(false)}
              onApplyWorkflow={handleApplyWorkflow}
            />
          </div>
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
