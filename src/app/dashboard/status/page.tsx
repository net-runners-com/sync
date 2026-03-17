"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity, CheckCircle2, XCircle, Clock, Loader2, RefreshCw,
  Play, ExternalLink, ChevronDown, ChevronRight, Calendar, Zap, AlertCircle
} from "lucide-react";

interface ExecutionLog {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  details: any;
}

interface WorkflowWithLogs {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isScheduled: boolean;
  schedule: string | null;
  nextRunAt: string | null;
  updatedAt: string;
  logs: ExecutionLog[];
}

const statusConfig = {
  PENDING: { icon: Clock, label: "待機中", color: "text-slate-400", bg: "bg-slate-800/50", dot: "bg-slate-500" },
  RUNNING: { icon: Loader2, label: "実行中", color: "text-blue-400", bg: "bg-blue-900/30", dot: "bg-blue-400" },
  SUCCESS: { icon: CheckCircle2, label: "成功", color: "text-emerald-400", bg: "bg-emerald-900/20", dot: "bg-emerald-400" },
  FAILED: { icon: XCircle, label: "失敗", color: "text-red-400", bg: "bg-red-900/20", dot: "bg-red-400" },
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "実行中...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function WorkflowCard({ workflow }: { workflow: WorkflowWithLogs }) {
  const [expanded, setExpanded] = useState(false);
  const latestLog = workflow.logs[0];
  const latestStatus = latestLog?.status ?? null;
  const successCount = workflow.logs.filter(l => l.status === "SUCCESS").length;
  const failCount = workflow.logs.filter(l => l.status === "FAILED").length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
      {/* ヘッダー */}
      <div className="p-5 flex items-start gap-4">
        {/* ステータスドット */}
        <div className="mt-1 flex-shrink-0">
          {latestStatus ? (
            <span className={`w-3 h-3 rounded-full block ${statusConfig[latestStatus].dot} ${latestStatus === "RUNNING" ? "animate-pulse" : ""}`} />
          ) : (
            <span className="w-3 h-3 rounded-full block bg-slate-700" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white text-sm">{workflow.name}</h3>
            {workflow.isScheduled && (
              <span className="text-[10px] px-2 py-0.5 bg-indigo-800/50 text-indigo-300 rounded-full font-medium flex items-center gap-1">
                <Calendar size={9} /> スケジュール済み
              </span>
            )}
            {workflow.isActive && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-800/40 text-emerald-300 rounded-full font-medium flex items-center gap-1">
                <Zap size={9} /> アクティブ
              </span>
            )}
          </div>
          {workflow.description && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{workflow.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[11px] text-slate-500">更新: {formatRelative(workflow.updatedAt)}</span>
            {latestLog && (
              <span className={`text-[11px] font-medium ${statusConfig[latestStatus!].color}`}>
                最終実行: {formatRelative(latestLog.startedAt)}
              </span>
            )}
          </div>
        </div>

        {/* 統計 + アクション */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">{successCount}</span> 成功 /{" "}
              <span className="text-red-400 font-bold">{failCount}</span> 失敗
            </div>
            <div className="text-[10px] text-slate-600">{workflow.logs.length}件の記録</div>
          </div>
          <Link
            href={`/editor?id=${workflow.id}`}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="エディターで開く"
          >
            <ExternalLink size={14} />
          </Link>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* 実行ログ */}
      {expanded && (
        <div className="border-t border-slate-800">
          {workflow.logs.length === 0 ? (
            <div className="px-5 py-4 text-xs text-slate-500 flex items-center gap-2">
              <AlertCircle size={14} />
              実行履歴がありません
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {workflow.logs.map((log) => {
                const cfg = statusConfig[log.status];
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className={`px-5 py-3 flex items-center gap-3 ${cfg.bg}`}>
                    <Icon
                      size={14}
                      className={`${cfg.color} flex-shrink-0 ${log.status === "RUNNING" ? "animate-spin" : ""}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[11px] text-slate-500">{formatRelative(log.startedAt)}</span>
                        <span className="text-[11px] text-slate-600">
                          所要時間: {formatDuration(log.startedAt, log.finishedAt)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {typeof log.details === "string"
                            ? log.details
                            : (log.details as any).message || JSON.stringify(log.details).slice(0, 80)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  const [workflows, setWorkflows] = useState<WorkflowWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows/status");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchStatus();
    // 30秒ごとに自動更新
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalSuccess = workflows.flatMap(w => w.logs).filter(l => l.status === "SUCCESS").length;
  const totalFailed = workflows.flatMap(w => w.logs).filter(l => l.status === "FAILED").length;
  const totalRunning = workflows.flatMap(w => w.logs).filter(l => l.status === "RUNNING").length;
  const activeWorkflows = workflows.filter(w => w.isActive || w.isScheduled).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* ヘッダー */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity size={24} className="text-blue-400" />
            ステータス
          </h1>
          <p className="text-sm text-slate-400 mt-1">ワークフローの稼働状況と実行履歴</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          更新
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "総ワークフロー", value: workflows.length, icon: Zap, color: "text-slate-300", border: "border-slate-700" },
          { label: "アクティブ", value: activeWorkflows, icon: Activity, color: "text-blue-400", border: "border-blue-800" },
          { label: "成功実行", value: totalSuccess, icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-800" },
          { label: "失敗実行", value: totalFailed, icon: XCircle, color: "text-red-400", border: "border-red-900" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-slate-900 border ${card.border} rounded-xl p-4`}>
              <div className={`flex items-center gap-2 text-xs font-medium mb-2 ${card.color}`}>
                <Icon size={14} />
                {card.label}
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* 実行中バナー */}
      {totalRunning > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-blue-900/30 border border-blue-700 rounded-xl px-5 py-3">
          <Loader2 size={16} className="text-blue-400 animate-spin flex-shrink-0" />
          <span className="text-sm text-blue-300 font-medium">
            {totalRunning}件のワークフローが現在実行中です
          </span>
        </div>
      )}

      {/* ワークフロー一覧 */}
      {loading && workflows.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-3" />
          読み込み中...
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
          <Activity size={40} className="opacity-30" />
          <p className="text-sm">ワークフローがありません</p>
          <Link href="/editor" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <Play size={14} /> 最初のフローを作る
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      )}

      {/* 最終更新時刻 */}
      <p className="text-center text-[11px] text-slate-700 mt-6">
        最終更新: {lastRefresh.toLocaleTimeString("ja-JP")} • 30秒毎に自動更新
      </p>
    </div>
  );
}
