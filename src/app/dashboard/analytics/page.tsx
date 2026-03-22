"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { 
  BarChart3, Twitter, Facebook, Instagram, Loader2, AlertCircle, Share2, MoreVertical, RotateCcw
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Bar, Legend, Cell, AreaChart, Area, BarChart
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

// Sparkline用ミニコンポーネント
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');

  return (
    <svg viewBox="0 -10 100 120" className="w-full h-8 mt-2 overflow-visible" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy={100 - ((data[data.length - 1] - min) / range) * 100} r="4" fill={color} />
    </svg>
  );
};

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "twitter" | "instagram" | "facebook">("overview");

  // Xリアルインサイト
  const [xInsights, setXInsights] = useState<any>(null);
  const [xLoading, setXLoading] = useState(false);
  const [xError, setXError] = useState<string | null>(null);
  const [xFetchedAt, setXFetchedAt] = useState<string | null>(null);
  const [xCached, setXCached] = useState(false);

  const fetchXInsights = async (force = false) => {
    setXLoading(true);
    setXError(null);
    try {
      const res = await fetch(`/api/insights/x${force ? "?force=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "取得失敗");
      setXInsights(json.data);
      setXFetchedAt(json.fetchedAt || json.data?.fetchedAt || null);
      setXCached(json.cached ?? false);
    } catch (e: any) {
      setXError(e.message);
    } finally {
      setXLoading(false);
    }
  };

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
    fetchXInsights(); // Xインサイトも並行取得
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={32} />
          <p>データを取得中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex items-center gap-4">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const currentData: AnalyticsData | null = activeTab === "overview" 
    ? {
        summary: {
          totalFollowers: (data?.twitter?.summary.totalFollowers || 0) + (data?.facebook?.summary.totalFollowers || 0) + (data?.instagram?.summary.totalFollowers || 0),
          monthlyImpressions: (data?.twitter?.summary.monthlyImpressions || 0) + (data?.facebook?.summary.monthlyImpressions || 0) + (data?.instagram?.summary.monthlyImpressions || 0),
          monthlyEngagements: (data?.twitter?.summary.monthlyEngagements || 0) + (data?.facebook?.summary.monthlyEngagements || 0) + (data?.instagram?.summary.monthlyEngagements || 0),
        },
        timeseries: data?.twitter?.timeseries || [] // Overviewグラフ用は一旦Twitterをベース（本来は合算処理が必要）
      }
    : data?.[activeTab as keyof PlatformData] || null;

  const isConnected = activeTab === "overview" || !!data?.[activeTab as keyof PlatformData];

  // Looker Studio風にデモデータをエンリッチ（APIからプロパティが来ていない場合の補完）
  const enrichedTimeSeries = currentData?.timeseries.map((t, i) => {
    // 疑似データ生成 (Looker Studioに寄せるため)
    const basePosts = Math.floor(Math.random() * 5) + 1;
    const engagements = t.engagements || Math.floor(t.impressions * 0.05);
    const engagementRate = t.impressions > 0 ? (engagements / t.impressions) * 100 : 0;
    
    // 内訳ダミー
    const likes = Math.floor(engagements * 0.6);
    const retweets = Math.floor(engagements * 0.2);
    const replies = Math.floor(engagements * 0.1);
    const urlClicks = Math.floor(engagements * 0.05);
    const profileClicks = engagements - likes - retweets - replies - urlClicks;

    return {
      ...t,
      dateFormatted: t.date.split("-").slice(1).join("/"), // MM/DD
      posts: basePosts,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      engagements: engagements,
      likes,
      retweets,
      replies,
      urlClicks,
      profileClicks
    };
  }) || [];

  const totalPosts = enrichedTimeSeries.reduce((sum, t) => sum + t.posts, 0);
  const totalEngagements = currentData?.summary.monthlyEngagements || 0;
  const totalImpressions = currentData?.summary.monthlyImpressions || 0;
  const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

  // Trend Sparkline Data (Last 14 days)
  const sparklineData = enrichedTimeSeries.slice(-14);

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white min-h-screen overflow-y-auto">
      {/* 👑 Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <BarChart3 size={18} />
          </div>
          <h1 className="text-lg font-medium tracking-wide">
            【アナリティクス】 パフォーマンスレポート
          </h1>
        </div>
        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
          <button className="flex items-center gap-2 hover:text-slate-900 dark:text-white transition text-sm bg-slate-50 dark:bg-slate-950 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
            <RotateCcw size={14} /> リセット
          </button>
          <button className="flex items-center gap-2 hover:text-slate-900 dark:text-white transition text-sm bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full">
            <Share2 size={14} /> 共有
          </button>
          <button className="hover:text-slate-900 dark:text-white transition w-8 h-8 flex justify-center items-center rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* 🎯 Tab Navigation (Looker style center-aligned tabs) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6">
        <div className="flex items-center justify-center gap-8">
          {[
            { id: "overview", label: "サマリー (全体)", icon: <BarChart3 size={16} /> },
            { id: "twitter", label: "X (Twitter)", icon: <Twitter size={16} /> },
            { id: "instagram", label: "Instagram", icon: <Instagram size={16} /> },
            { id: "facebook", label: "Facebook", icon: <Facebook size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* X (Twitter) リアルインサイトセクション */}
        {activeTab === "twitter" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Twitter className="w-5 h-5 text-slate-800 dark:text-slate-200" fill="currentColor" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">X (Twitter) アカウント</h2>
                  {xFetchedAt && (
                    <p className="text-xs text-slate-400">
                      {xCached ? "📦 キャッシュ" : "✅ 最新"} — {new Date(xFetchedAt).toLocaleString("ja-JP")} 取得
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchXInsights(true)}
                disabled={xLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 transition disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${xLoading ? "animate-spin" : ""}`} />
                {xLoading ? "取得中…" : "更新"}
              </button>
            </div>

            {xLoading && !xInsights && (
              <div className="flex items-center gap-3 text-slate-400 py-8 justify-center">
                <Loader2 className="animate-spin w-5 h-5" />
                <span className="text-sm">Playwright でXデータを取得中… (初回は30秒ほどかかります)</span>
              </div>
            )}

            {xError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{xError}</span>
              </div>
            )}

            {xInsights && (
              <>
                {/* プロフィール */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  {xInsights.profileImageUrl && (
                    <img
                      src={xInsights.profileImageUrl.replace("_normal", "_bigger")}
                      alt={xInsights.name}
                      className="w-14 h-14 rounded-full border-2 border-slate-200 dark:border-slate-700"
                    />
                  )}
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">{xInsights.name}</p>
                    <p className="text-slate-500 text-sm">@{xInsights.screenName}</p>
                  </div>
                </div>

                {/* KPIカード */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">フォロワー数</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {xInsights.followersCount?.toLocaleString("ja-JP") ?? "—"}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">フォロー中</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {xInsights.followingCount?.toLocaleString("ja-JP") ?? "—"}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">総ツイート数</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {xInsights.tweetsCount?.toLocaleString("ja-JP") ?? "—"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-4 text-center">
                  ⚠️ データは12時間ごとに更新されます。BANリスク低減のため意図的にキャッシュしています。
                </p>
              </>
            )}
          </div>
        )}

        {!isConnected ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl text-slate-900 dark:text-white mb-2">アカウントが連携されていません</h2>
            <p className="text-slate-400 mb-6">連携設定からアカウントを接続してください。</p>
          </div>
        ) : (
          <>
            {/* 📊 KPI Scorecards (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* カード1: 投稿数 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">投稿数</span>
                <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalPosts}</span>
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-medium flex items-center gap-1">↑ 12.5%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.posts)} color="#FF4E42" /></div>
              </div>

              {/* カード2: インプレッション数 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">インプレッション数</span>
                <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalImpressions.toLocaleString()}</span>
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-medium flex items-center gap-1">↑ 36.1%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.impressions)} color="#FF4E42" /></div>
              </div>

              {/* カード3: エンゲージメント率 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">エンゲージメント率</span>
                <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{avgEngagementRate.toFixed(2)}%</span>
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-medium flex items-center gap-1">↑ 52.3%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.engagementRate)} color="#FF4E42" /></div>
              </div>

              {/* カード4: エンゲージメント数 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">エンゲージメント数</span>
                <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalEngagements.toLocaleString()}</span>
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-medium flex items-center gap-1">↑ 107.3%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.engagements)} color="#FF4E42" /></div>
              </div>
            </div>

            {/* 📈 Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr] gap-6">
              
              {/* 【左側】 インプレッション ＆ エンゲージメント率 */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 h-[500px] flex flex-col">
                <div className="flex items-center justify-center gap-6 mb-6">
                   <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                     <span className="w-3 h-3 rounded-full bg-[#FF4E42]"></span>エンゲージメント率
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                     <span className="w-3 h-3 bg-[#00A5B4]"></span>インプレッション数
                   </div>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={enrichedTimeSeries} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3A4056" vertical={false} />
                      <XAxis 
                        dataKey="dateFormatted" 
                        stroke="#94A3B8" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#3A4056' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#94A3B8" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#94A3B8" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                        itemStyle={{ color: '#E2E8F0', fontSize: '12px' }}
                        labelStyle={{ color: '#94A3B8', marginBottom: '4px', fontSize: '12px' }}
                      />
                      <Bar yAxisId="right" dataKey="impressions" fill="#00A5B4" name="インプレッション数" />
                      <Line yAxisId="left" type="linear" dataKey="engagementRate" stroke="#FF4E42" strokeWidth={2} dot={{ r: 4, fill: '#FF4E42', strokeWidth: 0 }} name="エンゲージメント率" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 【右側】 縦並び2段チャート */}
              <div className="flex flex-col gap-6 h-[500px]">
                
                {/* 上段: 投稿数 */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 justify-center mb-4">
                     <span className="w-3 h-3 rounded-full bg-[#FF4E42]"></span>投稿数
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={enrichedTimeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3A4056" vertical={false} />
                        <XAxis 
                          dataKey="dateFormatted" 
                          stroke="#94A3B8" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#3A4056' }}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }} />
                        <Line type="linear" dataKey="posts" stroke="#FF4E42" strokeWidth={2} dot={{ r: 3, fill: '#FF4E42', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 下段: エンゲージメント内訳(スタックバー) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex-1 flex flex-col">
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-slate-600 dark:text-slate-300 mb-4">
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#FF4E42]"></span>いいね数</div>
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#00A5B4]"></span>リツイート数</div>
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#E11D48]"></span>返信数</div>
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#F97316]"></span>URLクリック</div>
                     <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#EAB308]"></span>プロフクリック</div>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={enrichedTimeSeries} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3A4056" vertical={false} />
                        <XAxis 
                          dataKey="dateFormatted" 
                          stroke="#94A3B8" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: '#3A4056' }}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Bar dataKey="likes" stackId="a" fill="#FF4E42" name="いいね数" />
                        <Bar dataKey="retweets" stackId="a" fill="#00A5B4" name="リツイート数" />
                        <Bar dataKey="replies" stackId="a" fill="#E11D48" name="返信数" />
                        <Bar dataKey="urlClicks" stackId="a" fill="#F97316" name="URLクリック数" />
                        <Bar dataKey="profileClicks" stackId="a" fill="#EAB308" name="プロフィールクリック数" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
