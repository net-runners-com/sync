"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Save, Settings, X, LogIn, LogOut, User } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useReactFlow } from "@xyflow/react";

interface EditorHeaderProps {
  onOpenSettings: () => void;
  workflowId?: string | null;
  initialName?: string;
}

export default function EditorHeader({ onOpenSettings, workflowId: propWorkflowId, initialName }: EditorHeaderProps) {
  const { data: session } = useSession();
  const { getNodes, getEdges } = useReactFlow();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
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
        alert("ワークフローを保存しました");
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("保存中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!workflowId) {
      alert("先にワークフローを保存してください");
      return;
    }
    
    setIsExecuting(true);
    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });

      if (res.ok) {
        alert("バックグラウンド実行をキューに追加しました");
      } else {
        alert("実行の開始に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("実行中にエラーが発生しました");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shadow-sm z-10 w-full">
      <div className="flex items-center gap-4">
        <h1 className="font-medium text-slate-800">{workflowName}</h1>
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
          Active
        </span>
      </div>
      <div className="flex items-center gap-3">
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
              <span className="text-xs font-bold text-slate-800">{session.user?.name || "ユーザー"}</span>
              <span className="text-[10px] text-slate-500">{session.user?.email || ""}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              {session.user?.image ? (
                <Image src={session.user.image} alt="Profile" width={32} height={32} />
              ) : (
                <User size={16} className="text-blue-600" />
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => signOut()}>
              <LogOut size={16} />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" variant="outline" className="gap-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-sm">
              <LogIn size={16} />
              ログイン
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
