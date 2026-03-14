"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus, MoreVertical, Trash2, Edit3, Clock, CheckCircle, PauseCircle,
  Loader2, Sparkles, FolderOpen, Folder, Upload, Download, FolderPlus,
  ChevronRight, Globe, Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  folder: string | null;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  edges: any[];
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

function WorkflowCard({
  workflow,
  onDelete,
  onMove,
}: {
  workflow: Workflow;
  onDelete: (id: string) => void;
  onMove: (id: string, folder: string | null) => void;
}) {
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

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = {
      name: workflow.name,
      description: workflow.description,
      folder: workflow.folder,
      nodes: workflow.nodes,
      edges: workflow.edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.name.replace(/[^a-zA-Z0-9ぁ-んァ-ン一-龥]/g, "_")}.sync`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  return (
    <div
      className="group bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
      onClick={() => router.push(`/editor?id=${workflow.id}`)}
    >
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-600 w-full" />
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-2 flex-1 flex items-center gap-2">
            {workflow.name}
            {workflow.isPublic && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold shrink-0">
                <Globe size={10} /> 公開中
              </span>
            )}
          </h3>
          <div className="relative flex-shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[160px]">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={(e) => { e.stopPropagation(); router.push(`/editor?id=${workflow.id}`); setMenuOpen(false); }}
                >
                  <Edit3 size={14} /> 編集する
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const nextPublic = !workflow.isPublic;
                    try {
                      await fetch(`/api/workflows/${workflow.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPublic: nextPublic }),
                      });
                      onDelete(workflow.id); // 一時的にリストのリロード用として呼び出し (実際はonUpdateが望ましい)
                      setMenuOpen(false);
                      // TODO: 本当は親コンポーネントで onUpdate に書き換えてリスト更新すべき
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  {workflow.isPublic ? (
                    <><Lock size={14} /> 非公開にする</>
                  ) : (
                    <><Globe size={14} /> 公開する</>
                  )}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={handleExport}
                >
                  <Download size={14} /> エクスポート
                </button>
                <div className="border-t border-slate-100" />
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
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            workflow.isActive ? "text-green-700 bg-green-100" : "text-slate-500 bg-slate-100"
          }`}>
            {workflow.isActive ? <><CheckCircle size={11} /> 稼働中</> : <><PauseCircle size={11} /> 停止中</>}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} /> {timeAgo(workflow.updatedAt)}
          </span>
        </div>
      </div>
      <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  // フォルダ関連
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = すべて
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWorkflows(data); })
      .finally(() => setLoading(false));
  }, []);

  // フォルダ一覧（重複なし）
  const folders = Array.from(
    new Set(workflows.map((w) => w.folder).filter((f): f is string => !!f))
  ).sort();

  // 表示するワークフロー
  const filtered =
    selectedFolder === null
      ? workflows
      : workflows.filter((w) => w.folder === selectedFolder);

  const handleDelete = (id: string) => setWorkflows((prev) => prev.filter((w) => w.id !== id));

  const handleMove = async (id: string, folder: string | null) => {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return;
    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: wf.name, nodes: wf.nodes, edges: wf.edges, folder }),
    });
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, folder } : w));
  };

  const handleCreate = async (folder?: string | null) => {
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新しいワークフロー",
          description: "",
          nodes: [],
          edges: [],
          folder: folder ?? selectedFolder ?? null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/editor?id=${data.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        const data = JSON.parse(text);
        await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name || "インポートしたフロー",
            description: data.description || "",
            nodes: data.nodes || [],
            edges: data.edges || [],
            folder: data.folder || selectedFolder || null,
          }),
        });
      }
      // 再取得
      const res = await fetch("/api/workflows");
      const updated = await res.json();
      if (Array.isArray(updated)) setWorkflows(updated);
    } catch {
      alert("インポートに失敗しました。正しい .sync ファイルを選択してください。");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setSelectedFolder(newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
  };

  return (
    <div className="flex h-full">
      {/* フォルダサイドバー */}
      <aside className="w-56 border-r border-slate-200 bg-slate-50/60 flex flex-col gap-1 p-4 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">フォルダ</span>
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
            title="新しいフォルダ"
          >
            <FolderPlus size={15} />
          </button>
        </div>

        {showNewFolder && (
          <div className="flex gap-1 mb-2">
            <input
              className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="フォルダ名"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            <button onClick={handleCreateFolder} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
              ✓
            </button>
          </div>
        )}

        <button
          onClick={() => setSelectedFolder(null)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full text-left ${
            selectedFolder === null ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FolderOpen size={15} />
          すべて
          <span className="ml-auto text-xs text-slate-400">{workflows.length}</span>
        </button>

        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setSelectedFolder(f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full text-left ${
              selectedFolder === f ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Folder size={15} />
            <span className="truncate flex-1">{f}</span>
            <span className="ml-auto text-xs text-slate-400">
              {workflows.filter((w) => w.folder === f).length}
            </span>
          </button>
        ))}
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {selectedFolder ? (
                <>
                  <Folder size={24} className="text-blue-500" />
                  {selectedFolder}
                </>
              ) : (
                <>
                  <FolderOpen size={24} className="text-blue-500" />
                  マイプロジェクト
                </>
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {filtered.length} 件のワークフロー
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* インポートボタン */}
            <input
              ref={importRef}
              type="file"
              accept=".sync"
              multiple
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              インポート
            </button>
            {/* 新規作成ボタン */}
            <button
              onClick={() => handleCreate()}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm disabled:opacity-60"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              新規作成
            </button>
          </div>
        </div>

        {/* ワークフロー一覧 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <Sparkles size={36} />
            </div>
            <div>
              <p className="text-slate-700 font-bold text-lg">
                {selectedFolder ? `「${selectedFolder}」にプロジェクトがありません` : "プロジェクトがまだありません"}
              </p>
              <p className="text-sm text-slate-400 mt-1">「新規作成」から最初のフローを作ってみましょう！</p>
            </div>
            <button
              onClick={() => handleCreate()}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              新規作成
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((wf) => (
              <WorkflowCard key={wf.id} workflow={wf} onDelete={handleDelete} onMove={handleMove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
