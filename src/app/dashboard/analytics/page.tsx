"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart3, TrendingUp, Users, Eye, Activity,
  Twitter, Facebook, Instagram, Loader2, AlertCircle
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalFollowers: number;
    monthlyImpressions: number;
    monthlyEngagements: number;
  };
  timeseries: {
    date: string;
    followers: number;
    impressions: number;
    engagements: number;
  }[];
}

interface PlatformData {
  twitter: AnalyticsData | null;
  facebook: AnalyticsData | null;
  instagram: AnalyticsData | null;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "twitter" | "instagram" | "facebook">("overview");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p>インサイトデータを取得中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex items-center gap-4">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // アクティブなタブのデータを取得
  const currentData: AnalyticsData | null = activeTab === "overview" 
    ? null // Overviewは全体の合算等を表示（今回は各プラットのどれか一つをデモ用に使用）
    : data?.[activeTab as keyof PlatformData] || null;

  // Overview用の合算データ計算
  const calcOverview = () => {
    if (!data) return { followers: 0, impressions: 0, engagements: 0 };
    return {
      followers: (data.twitter?.summary.totalFollowers || 0) + (data.facebook?.summary.totalFollowers || 0) + (data.instagram?.summary.totalFollowers || 0),
      impressions: (data.twitter?.summary.monthlyImpressions || 0) + (data.facebook?.summary.monthlyImpressions || 0) + (data.instagram?.summary.monthlyImpressions || 0),
      engagements: (data.twitter?.summary.monthlyEngagements || 0) + (data.facebook?.summary.monthlyEngagements || 0) + (data.instagram?.summary.monthlyEngagements || 0),
    };
  };

  const overview = calcOverview();

  // プラットフォーム接続チェック
  const isConnected = (platform: keyof PlatformData) => !!data?.[platform];

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-blue-500" size={32} />
            アナリティクス
          </h1>
          <p className="text-slate-400 mt-2">各SNSアカウントのパフォーマンス推移とインサイトを確認できます。</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-slate-800/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "overview" 
                ? "bg-slate-700 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            全体サマリー
          </button>
          
          <button
            onClick={() => setActiveTab("twitter")}
            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              activeTab === "twitter" 
                ? "bg-white text-black shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Twitter size={16} />
            X (Twitter)
          </button>
          
          <button
            onClick={() => setActiveTab("instagram")}
            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              activeTab === "instagram" 
                ? "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Instagram size={16} />
            Instagram
          </button>
          
          <button
            onClick={() => setActiveTab("facebook")}
            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              activeTab === "facebook" 
                ? "bg-[#1877F2] text-white shadow-sm" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Facebook size={16} />
            Facebook
          </button>
        </div>

        {/* Overview Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-blue-400 mb-4">
                    <Users size={20} />
                    <h3 className="font-semibold">総フォロワー数</h3>
                  </div>
                  <p className="text-4xl font-bold text-white tracking-tight">
                    {overview.followers.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                    <TrendingUp size={14} /> +320 (30日間)
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-purple-400 mb-4">
                    <Eye size={20} />
                    <h3 className="font-semibold">月間インプレッション</h3>
                  </div>
                  <p className="text-4xl font-bold text-white tracking-tight">
                    {overview.impressions.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                    <TrendingUp size={14} /> +15.2%
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-emerald-400 mb-4">
                    <Activity size={20} />
                    <h3 className="font-semibold">合計エンゲージメント</h3>
                  </div>
                  <p className="text-4xl font-bold text-white tracking-tight">
                    {overview.engagements.toLocaleString()}
                  </p>
                  <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
                    平均エンゲージメント率: {((overview.engagements / Math.max(overview.impressions, 1)) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl flex items-start gap-4 text-sm">
              <AlertCircle className="flex-shrink-0" size={20} />
              <p>概要タブでは、連携済みのすべてのアカウント（X, Facebook, Instagram）の合算データを表示しています。プラットフォームごとの詳細な推移は、各タブを切り替えてご確認ください。</p>
            </div>
          </div>
        )}

        {/* Platform Specific Tab Content */}
        {activeTab !== "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isConnected(activeTab as keyof PlatformData) ? (
              // 未連携時の表示
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                  {activeTab === "twitter" && <Twitter size={32} className="text-slate-500" />}
                  {activeTab === "instagram" && <Instagram size={32} className="text-slate-500" />}
                  {activeTab === "facebook" && <Facebook size={32} className="text-slate-500" />}
                </div>
                <h2 className="text-xl font-bold text-white mb-2">アカウントが連携されていません</h2>
                <p className="text-slate-400 max-w-md mb-6">
                  {activeTab === "twitter" ? "X (Twitter)" : activeTab === "instagram" ? "Instagram" : "Facebook"} 
                  のアナリティクスデータを確認するには、設定画面からOAuth連携を完了してください。
                </p>
                <a href="/dashboard/settings" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                  連携設定へ移動する
                </a>
              </div>
            ) : (
              // 連携済み時のデータ表示
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-sm font-medium text-slate-400">フォロワー数</p>
                    <p className="text-3xl font-bold text-white mt-1 pt-1 border-t border-slate-700/50">
                      {currentData?.summary.totalFollowers.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-sm font-medium text-slate-400">30日間のインプレッション</p>
                    <p className="text-3xl font-bold text-white mt-1 pt-1 border-t border-slate-700/50">
                      {currentData?.summary.monthlyImpressions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                    <p className="text-sm font-medium text-slate-400">30日間のエンゲージメント</p>
                    <p className="text-3xl font-bold text-white mt-1 pt-1 border-t border-slate-700/50">
                      {currentData?.summary.monthlyEngagements.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Charts Area */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">インプレッション推移 (30日間)</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={currentData?.timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94A3B8" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => val.split("-").slice(1).join("/")} 
                        />
                        <YAxis 
                          stroke="#94A3B8" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#E2E8F0' }}
                          labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="impressions" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorImpressions)" 
                          name="インプレッション"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6">エンゲージメント数・フォロワー推移</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={currentData?.timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94A3B8" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => val.split("-").slice(1).join("/")} 
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#94A3B8" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#94A3B8" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="engagements" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          name="エンゲージメント"
                          dot={false}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="followers" 
                          stroke="#8B5CF6" 
                          strokeWidth={3}
                          name="累計フォロワー"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
