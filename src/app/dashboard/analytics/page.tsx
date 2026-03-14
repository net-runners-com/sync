"use client";

import React, { useEffect, useState } from "react";
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
      <div className="flex-1 p-8 flex items-center justify-center min-h-[60vh] bg-[#1D212F]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="animate-spin text-[#00A5B4]" size={32} />
          <p>データを取得中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 bg-[#1D212F]">
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
    <div className="flex-1 bg-[#1D212F] text-white min-h-screen overflow-y-auto">
      {/* 👑 Top Header Bar */}
      <div className="bg-[#282C3D] px-6 py-3 flex items-center justify-between border-b border-[#3A4056]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[#00A5B4]">
            <BarChart3 size={18} />
          </div>
          <h1 className="text-lg font-medium tracking-wide">
            【アナリティクス】 パフォーマンスレポート
          </h1>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <button className="flex items-center gap-2 hover:text-white transition text-sm bg-[#1D212F] px-4 py-1.5 rounded-full border border-[#3A4056]">
            <RotateCcw size={14} /> リセット
          </button>
          <button className="flex items-center gap-2 hover:text-white transition text-sm bg-blue-500/20 text-[#00A5B4] px-4 py-1.5 rounded-full">
            <Share2 size={14} /> 共有
          </button>
          <button className="hover:text-white transition w-8 h-8 flex justify-center items-center rounded-full bg-[#1D212F] border border-[#3A4056]">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* 🎯 Tab Navigation (Looker style center-aligned tabs) */}
      <div className="bg-[#282C3D] border-b border-[#3A4056] px-6">
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
                  ? "border-[#00A5B4] text-[#00A5B4]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {!isConnected ? (
          <div className="bg-[#282C3D] rounded-xl p-12 text-center border border-[#3A4056]">
            <h2 className="text-xl text-white mb-2">アカウントが連携されていません</h2>
            <p className="text-slate-400 mb-6">連携設定からアカウントを接続してください。</p>
          </div>
        ) : (
          <>
            {/* 📊 KPI Scorecards (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* カード1: 投稿数 */}
              <div className="bg-[#282C3D] rounded-xl p-5 border border-[#3A4056] flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">投稿数</span>
                <span className="text-3xl font-bold text-white mb-1">{totalPosts}</span>
                <span className="text-[#00A5B4] text-[10px] font-medium flex items-center gap-1">↑ 12.5%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.posts)} color="#FF4E42" /></div>
              </div>

              {/* カード2: インプレッション数 */}
              <div className="bg-[#282C3D] rounded-xl p-5 border border-[#3A4056] flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">インプレッション数</span>
                <span className="text-3xl font-bold text-white mb-1">{totalImpressions.toLocaleString()}</span>
                <span className="text-[#00A5B4] text-[10px] font-medium flex items-center gap-1">↑ 36.1%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.impressions)} color="#FF4E42" /></div>
              </div>

              {/* カード3: エンゲージメント率 */}
              <div className="bg-[#282C3D] rounded-xl p-5 border border-[#3A4056] flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">エンゲージメント率</span>
                <span className="text-3xl font-bold text-white mb-1">{avgEngagementRate.toFixed(2)}%</span>
                <span className="text-[#00A5B4] text-[10px] font-medium flex items-center gap-1">↑ 52.3%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.engagementRate)} color="#FF4E42" /></div>
              </div>

              {/* カード4: エンゲージメント数 */}
              <div className="bg-[#282C3D] rounded-xl p-5 border border-[#3A4056] flex flex-col items-center justify-center text-center">
                <span className="text-slate-400 text-xs font-medium mb-2">エンゲージメント数</span>
                <span className="text-3xl font-bold text-white mb-1">{totalEngagements.toLocaleString()}</span>
                <span className="text-[#00A5B4] text-[10px] font-medium flex items-center gap-1">↑ 107.3%</span>
                <div className="w-full px-4 mt-2"><Sparkline data={sparklineData.map(d => d.engagements)} color="#FF4E42" /></div>
              </div>
            </div>

            {/* 📈 Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr] gap-6">
              
              {/* 【左側】 インプレッション ＆ エンゲージメント率 */}
              <div className="bg-[#282C3D] rounded-xl p-6 border border-[#3A4056] h-[500px] flex flex-col">
                <div className="flex items-center justify-center gap-6 mb-6">
                   <div className="flex items-center gap-2 text-xs text-slate-300">
                     <span className="w-3 h-3 rounded-full bg-[#FF4E42]"></span>エンゲージメント率
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-300">
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
                        contentStyle={{ backgroundColor: '#1D212F', borderColor: '#3A4056', borderRadius: '8px', color: '#fff' }}
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
                <div className="bg-[#282C3D] rounded-xl p-6 border border-[#3A4056] flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-300 justify-center mb-4">
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
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1D212F', borderColor: '#3A4056', borderRadius: '8px' }} />
                        <Line type="linear" dataKey="posts" stroke="#FF4E42" strokeWidth={2} dot={{ r: 3, fill: '#FF4E42', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 下段: エンゲージメント内訳(スタックバー) */}
                <div className="bg-[#282C3D] rounded-xl p-6 border border-[#3A4056] flex-1 flex flex-col">
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-slate-300 mb-4">
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
                          contentStyle={{ backgroundColor: '#1D212F', borderColor: '#3A4056', borderRadius: '8px' }}
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
