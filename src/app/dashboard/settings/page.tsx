"use client";

import React, { useState, useEffect } from "react";
import { Twitter, Instagram, Facebook, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTheme } from "@/lib/ThemeContext";

interface SocialAccountStatus {
  connected: boolean;
  accountId?: string;
  hasToken: boolean;
  scope?: string | null;
}

interface SocialAccounts {
  facebook?: SocialAccountStatus;
  instagram?: SocialAccountStatus;
  twitter?: SocialAccountStatus;
  google?: SocialAccountStatus;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [socialAccounts, setSocialAccounts] = useState<SocialAccounts>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchSocialAccounts();
  }, []);

  const fetchSocialAccounts = async () => {
    try {
      const res = await fetch("/api/user/social-accounts");
      if (res.ok) {
        const data = await res.json();
        setSocialAccounts(data.accounts || {});
      }
    } catch (error) {
      console.error("Failed to fetch social accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      // NextAuth の signIn でOAuthフローを開始
      // callbackUrl はログイン後に戻るページ
      await signIn(provider, {
        callbackUrl: "/dashboard/settings?connected=" + provider,
      });
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);
      setConnecting(null);
    }
  };

  const platforms = [
    {
      id: "facebook",
      name: "Facebook Pages",
      icon: <Facebook className="w-6 h-6 text-blue-600" fill="currentColor" stroke="none" />,
      description: "Facebookページへの投稿・スケジュール管理。Instagramへの投稿にも使用されます。",
      connected: socialAccounts.facebook?.connected || false,
      hasToken: socialAccounts.facebook?.hasToken || false,
      color: "bg-blue-50",
      borderColor: "border-blue-200",
      accentColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "facebook", // Instagramは同じFacebook OAuthで認証
      name: "Instagram Business",
      icon: <Instagram className="w-6 h-6 text-pink-600" />,
      description: "Facebookアカウントで連携します。ビジネスアカウントのみ対応。",
      connected: socialAccounts.facebook?.connected || false,
      hasToken: socialAccounts.facebook?.hasToken || false,
      color: "bg-pink-50",
      borderColor: "border-pink-200",
      accentColor: "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700",
      note: "Facebook連携と同時に設定されます",
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      icon: <Twitter className="w-6 h-6 text-slate-800" fill="currentColor" />,
      description: "ツイート自動化機能を利用して、投稿をスケジューリングできます。",
      connected: socialAccounts.twitter?.connected || false,
      hasToken: socialAccounts.twitter?.hasToken || false,
      color: "bg-slate-100",
      borderColor: "border-slate-200",
      accentColor: "bg-slate-800 hover:bg-slate-900",
      note: "X開発者ポータルでアプリを作成し、環境変数を設定してください。",
      disabled: false,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">連携・設定</h1>
          <p className="text-slate-500 mt-2">
            ワークフローから各プラットフォームへ投稿するために、SNS・外部サービスのアカウントを連携してください。
          </p>
        </header>

        {/* 重要なお知らせ */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-start text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="text-amber-800">
            <span className="font-bold block mb-1">Metaアプリの設定が必要です</span>
            Facebookでの連携を有効にするには、<strong>Meta for Developers</strong>でアプリを作成し、
            <code className="bg-amber-100 px-1 rounded mx-1">FACEBOOK_CLIENT_ID</code>と
            <code className="bg-amber-100 px-1 rounded mx-1">FACEBOOK_CLIENT_SECRET</code>
            を<code className="bg-amber-100 px-1 rounded">.env</code>ファイルに設定してください。
            コールバックURL: <code className="bg-amber-100 px-1 rounded text-xs">http://localhost:3000/api/auth/callback/facebook</code>
          </div>
        </div>

        {/* テーマ設定 */}
        <div className="bg-white border flex-shrink-0 border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">テーマ設定</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <Sun size={24} className="mb-2" />
              <span className="text-sm font-semibold">ライト</span>
            </button>
            <button 
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <Moon size={24} className="mb-2" />
              <span className="text-sm font-semibold">ダーク</span>
            </button>
            <button 
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <Monitor size={24} className="mb-2" />
              <span className="text-sm font-semibold">システム</span>
            </button>
          </div>
        </div>

        {/* SNS連携リスト */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span>連携状況を確認中...</span>
            </div>
          ) : (
            platforms.map((platform, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-6 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-shadow ${platform.connected ? "border-green-200 bg-green-50/30" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${platform.color} border ${platform.borderColor}`}>
                    {platform.icon}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{platform.name}</h3>
                      {platform.connected && platform.hasToken && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} />
                          連携済み
                        </span>
                      )}
                      {platform.disabled && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          準備中
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{platform.description}</p>
                    {platform.note && (
                      <p className="text-xs text-purple-600 mt-1 font-medium">📎 {platform.note}</p>
                    )}
                    {platform.connected && platform.hasToken && (
                      <p className="text-xs font-mono text-slate-500 mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit">
                        ID: {socialAccounts.facebook?.accountId?.substring(0, 12)}...
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => !platform.disabled && handleConnect(platform.id)}
                  disabled={connecting !== null || platform.disabled}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    platform.connected && platform.hasToken
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : `text-white shadow-sm ${platform.accentColor}`
                  }`}
                >
                  {connecting === platform.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      認証中...
                    </>
                  ) : platform.connected && platform.hasToken ? (
                    <>
                      <LogOut size={16} />
                      再連携する
                    </>
                  ) : (
                    <>
                      <LinkIcon size={16} />
                      連携する
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* スコープの説明 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">連携時に要求する権限について</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex gap-2"><span className="text-blue-500 font-mono">pages_manage_posts</span><span>– Facebookページへの投稿</span></div>
            <div className="flex gap-2"><span className="text-blue-500 font-mono">pages_read_engagement</span><span>– いいね・コメントなどのエンゲージメント読み取り</span></div>
            <div className="flex gap-2"><span className="text-pink-500 font-mono">instagram_basic</span><span>– Instagramアカウント情報の読み取り</span></div>
            <div className="flex gap-2"><span className="text-pink-500 font-mono">instagram_content_publish</span><span>– Instagram への画像・動画投稿</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
