"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Save, Settings, X, LogIn, LogOut, User, LayoutDashboard, Edit2, Sparkles } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";

interface EditorHeaderProps {
  onOpenSettings: () => void;
  onToggleAi?: () => void;
  isAiOpen?: boolean;
  workflowId?: string | null;
  initialName?: string;
  onExecute?: (workflowId: string | null, nodes: any[], edges: any[]) => Promise<void>;
  isExecuting?: boolean;
}

export default function EditorHeader({ onOpenSettings, onToggleAi, isAiOpen, workflowId: propWorkflowId, initialName, onExecute, isExecuting: externalExecuting }: EditorHeaderProps) {
  const { data: session } = useSession();
  const { getNodes, getEdges } = useReactFlow();
  
  const [isSaving, setIsSaving] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(propWorkflowId ?? null);
  const [workflowName, setWorkflowName] = useState(initialName ?? "新しいワークフロー");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nodes = getNodes();
      const edges = getEdges();
      
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: workflowId,
          name: workflowName,
          description: "最新のトレンドニュースを取得してポジティブな内容を要約し、Xに投稿する自動化フロー。",
          nodes,
          edges,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWorkflowId(data.id);
        toast.success("ワークフローを保存しました");
      } else {
        toast.error("保存に失敗しました");
      }
    } catch (err) {
      console.error(err);
      toast.error("保存中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    // 実行前に必ず最新状態を保存する
    await handleSave();

    const nodes = getNodes();
    const edges = getEdges();
    if (onExecute) {
      await onExecute(workflowId, nodes, edges);
    } else {
      toast.error("先にワークフローを保存してください");
    }
  };

  const isExecuting = externalExecuting ?? false;

  return (
    <header className="h-14 border-b bg-white dark:bg-slate-900 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 w-full">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/dashboard" className="hidden md:block">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100">
            <LayoutDashboard size={16} />
            ダッシュボード
          </Button>
        </Link>
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
        
        <div className="flex items-center gap-2 group relative">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="font-medium text-slate-800 dark:text-slate-100 bg-transparent border border-transparent hover:border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-950 focus:border-blue-500 focus:bg-white dark:bg-slate-900 focus:outline-none rounded px-2 py-1 transition-colors w-[150px] md:w-[250px]"
            placeholder="ワークフロー名"
          />
          <Edit2 size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 pointer-events-none" />
        </div>

        <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] md:text-xs rounded-full font-medium whitespace-nowrap">
          Active
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* AIアシストボタン */}
        <button
          onClick={onToggleAi}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isAiOpen
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
              : "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/40 border border-violet-200 dark:border-violet-700"
          }`}
        >
          <Sparkles size={13} className={isAiOpen ? "animate-pulse" : ""} />
          AI アシスト
        </button>
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={onOpenSettings}
        >
          <Settings size={16} />
          設定
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <span className="animate-spin h-4 w-4 border-b-2 border-slate-700 rounded-full" /> : <Save size={16} />}
          保存
        </Button>
        <Button 
          size="sm" 
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={handleExecute}
          disabled={isExecuting}
        >
          {isExecuting ? <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /> : <Play size={16} />}
          テスト実行
        </Button>

        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        {session ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{session.user?.name || "ユーザー"}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{session.user?.email || ""}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
              {session.user?.image ? (
                <Image src={session.user.image} alt="Profile" width={32} height={32} />
              ) : (
                <User size={16} className="text-blue-600" />
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => signOut()}>
              <LogOut size={16} />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="outline" className="gap-2 border-slate-300 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 shadow-sm">
              <LogIn size={16} />
              ログイン
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
