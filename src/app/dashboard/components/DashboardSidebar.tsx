"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, FileVideo, CreditCard, Settings, Sparkles, LogOut, User, LogIn, Zap, Globe, Box, BarChart3 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function DashboardSidebar() {
  const { data: session } = useSession();
  const [planInfo, setPlanInfo] = useState({ plan: "FREE", executions: 0 });

  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/user/plan')
        .then(res => res.json())
        .then(data => {
          if (data.plan) {
            setPlanInfo({ plan: data.plan, executions: data.monthlyExecutions || 0 });
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const maxExecutions = planInfo.plan === "PRO" ? 100 : planInfo.plan === "ENTERPRISE" ? Infinity : 3;
  const executionPercentage = maxExecutions === Infinity ? 0 : Math.min((planInfo.executions / maxExecutions) * 100, 100);

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-blue-400" size={24} />
          Sync
        </h1>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-2">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg font-medium transition-colors">
          <LayoutDashboard size={18} />
          ダッシュボード
        </Link>
        <Link href="/dashboard/projects" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <FileVideo size={18} />
          マイプロジェクト
        </Link>
        <Link href="/dashboard/custom-nodes" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <Box size={18} />
          マイカスタムノード
        </Link>
        <Link href="/dashboard/marketplace" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <Globe size={18} />
          テンプレートギャラリー
        </Link>
        <Link href="/dashboard/ai-test" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <Zap size={18} />
          AI テスト
        </Link>
        <Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <CreditCard size={18} />
          プラン・決済
        </Link>
        <Link href="/dashboard/analytics" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <BarChart3 size={18} />
          アナリティクス
        </Link>
        <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
          <Settings size={18} />
          連携設定 (OAuth)
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-800 flex flex-col gap-4">
        {/* Plan Info */}
        <div className="bg-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-xs font-bold px-2 py-0.5 rounded ${
              planInfo.plan === "PRO" ? "bg-amber-500/20 text-amber-400" : 
              planInfo.plan === "ENTERPRISE" ? "bg-purple-500/20 text-purple-400" : 
              "bg-slate-700 text-slate-300"
            }`}>
              {planInfo.plan} プラン
            </div>
          </div>
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-white">実行回数</span>
            <span className="text-white font-mono">{planInfo.executions} / {maxExecutions === Infinity ? '∞' : maxExecutions}</span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                executionPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'
              }`} 
              style={{ width: `${maxExecutions === Infinity ? 100 : executionPercentage}%` }}
            />
          </div>
        </div>

        {/* User Profile */}
        {session ? (
          <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-xl">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {session.user?.image ? (
                  <Image src={session.user.image} alt="Profile" width={32} height={32} />
                ) : (
                  <User size={16} className="text-slate-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-sm font-semibold text-white truncate">{session.user?.name || "ユーザー"}</span>
                <span className="text-[10px] text-slate-400 truncate">{session.user?.email || ""}</span>
              </div>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
              title="ログアウト"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/login" className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <LogIn size={16} />
            ログイン
          </Link>
        )}
      </div>
    </div>
  );
}
