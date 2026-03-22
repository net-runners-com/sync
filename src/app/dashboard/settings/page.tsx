"use client";

import React, { useState, useEffect } from "react";
import { Twitter, Instagram, Facebook, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, LogOut, Sun, Moon, Monitor, X } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTheme } from "@/lib/ThemeContext";

interface SocialAccountStatus {
  accountId: string;
  hasToken: boolean;
  scope?: string | null;
}

interface SocialAccounts {
  facebook?: SocialAccountStatus[];
  instagram?: SocialAccountStatus[];
  twitter?: SocialAccountStatus[];
  google?: SocialAccountStatus[];
  [key: string]: SocialAccountStatus[] | undefined;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [socialAccounts, setSocialAccounts] = useState<SocialAccounts>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [twitterConfirmOpen, setTwitterConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const handleDisconnect = async (provider: string, providerAccountId: string) => {
    if (!confirm(`このアカウントの連携を解除しますか？\n(${provider}: ${providerAccountId})`)) return;
    const key = `${provider}:${providerAccountId}`;
    setDisconnecting(key);
    try {
      const res = await fetch("/api/user/social-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, providerAccountId }),
      });
      if (res.ok) {
        setSocialAccounts((prev) => {
          const updated = { ...prev };
          if (updated[provider]) {
            updated[provider] = updated[provider]!.filter(
              (a: any) => a.accountId !== providerAccountId
            );
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDisconnecting(null);
    }
  };

  useEffect(() => {
    fetchSocialAccounts();

    // Facebook SDKの読み込み
    const initFacebookSdk = async () => {
      try {
        const res = await fetch("/api/user/social-accounts/facebook");
        const data = await res.json();
        if (data.appId) {
          (window as any).fbAsyncInit = function() {
            (window as any).FB.init({
              appId      : data.appId,
              cookie     : true,
              xfbml      : true,
              version    : 'v19.0'
            });
          };

          (function(d, s, id){
             var js, fjs = d.getElementsByTagName(s)[0];
             if (d.getElementById(id)) {return;}
             js = d.createElement(s) as HTMLScriptElement; js.id = id;
             js.src = "https://connect.facebook.net/ja_JP/sdk.js";
             if (fjs && fjs.parentNode) {
               fjs.parentNode.insertBefore(js, fjs);
             } else {
               d.head.appendChild(js);
             }
           }(document, 'script', 'facebook-jssdk'));
        }
      } catch (err) {
        console.error("Failed to init Facebook SDK", err);
      }
    };
    initFacebookSdk();
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
      if (provider === "facebook") {
        if (!(window as any).FB) {
          alert("Facebook SDKが読み込まれていません。ページをリロードしてください。");
          setConnecting(null);
          return;
        }
        (window as any).FB.login(async function(response: any) {
          if (response.authResponse) {
            const { accessToken, userID } = response.authResponse;
            try {
              const res = await fetch("/api/user/social-accounts/facebook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken, userID }),
              });
              if (res.ok) {
                await fetchSocialAccounts();
              } else {
                const err = await res.json();
                alert("Facebook連携エラー: " + (err.error || "不明なエラー"));
              }
            } catch (apiErr) {
              console.error(apiErr);
              alert("通信エラーが発生しました");
            }
          } else {
            console.log("User cancelled login or did not fully authorize.");
          }
          setConnecting(null);
        }, { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish', return_scopes: true });
        return;
      }

      if (provider === "threads") {
        await signIn("threads", { callbackUrl: "/dashboard/settings?connected=threads" });
      } else {
        await signIn(
          provider,
          { callbackUrl: "/dashboard/settings?connected=" + provider },
          { prompt: provider === "twitter" ? "consent" : "select_account" }
        );
      }
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);
      setConnecting(null);
    }
  };

  const handleConnectClick = (platformId: string, isConnected: boolean) => {
    if (platformId === "twitter" && isConnected) {
      setTwitterConfirmOpen(true);
    } else {
      handleConnect(platformId);
    }
  };

  const platforms = [
    {
      id: "facebook",
      name: "Facebook Pages",
      icon: <Facebook className="w-6 h-6 text-blue-600" fill="currentColor" stroke="none" />,
      description: "Facebookページへの投稿・スケジュール管理。Instagramへの投稿にも使用されます。",
      accounts: socialAccounts.facebook || [],
      color: "bg-blue-50",
      borderColor: "border-blue-200",
      accentColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "facebook", // Instagramは同じFacebook OAuthで認証
      name: "Instagram Business",
      icon: <Instagram className="w-6 h-6 text-pink-600" />,
      description: "Facebookアカウントで連携します。ビジネスアカウントのみ対応。",
      accounts: socialAccounts.facebook || [],
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
      accounts: socialAccounts.twitter || [],
      color: "bg-slate-100",
      borderColor: "border-slate-200",
      accentColor: "bg-slate-800 hover:bg-slate-900",
      note: "X開発者ポータルでアプリを作成し、環境変数を設定してください。",
      disabled: false,
    },
    {
      id: "threads",
      name: "Threads",
      // Threads専用のアイコンがないため、プレースホルダーとしてMessageCircleを使用するかテキストアイコンにします
      icon: <span className="text-2xl font-bold font-serif text-slate-900 dark:text-white">@</span>,
      description: "Threadsへの自動投稿機能を利用できます。専用のMetaアプリ設定が必要です。",
      accounts: socialAccounts.threads || [],
      color: "bg-slate-100 dark:bg-slate-800",
      borderColor: "border-slate-200 dark:border-slate-700",
      accentColor: "bg-slate-900 dark:bg-slate-700 hover:bg-black dark:hover:bg-slate-600",
      note: "Meta開発者ポータルで「Threads API」環境変数を設定してください。",
      disabled: false,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">連携・設定</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            ワークフローから各プラットフォームへ投稿するために、SNS・外部サービスのアカウントを連携してください。
          </p>
        </header>

        {/* 重要なお知らせ */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex gap-3 items-start text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
          <div className="text-amber-800 dark:text-amber-200">
            <span className="font-bold block mb-1 text-amber-900 dark:text-amber-400">Metaアプリの設定が必要です</span>
            Facebookでの連携を有効にするには、<strong>Meta for Developers</strong>でアプリを作成し、
            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded mx-1">FACEBOOK_CLIENT_ID</code>と
            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded mx-1">FACEBOOK_CLIENT_SECRET</code>
            を<code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env</code>ファイルに設定してください。
            コールバックURL: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded text-xs select-all">http://localhost:3000/api/auth/callback/facebook</code>
          </div>
        </div>

        {/* テーマ設定 */}
        <div className="bg-white dark:bg-slate-900 border flex-shrink-0 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4">テーマ設定</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
              <Sun size={24} className="mb-2" />
              <span className="text-sm font-semibold">ライト</span>
            </button>
            <button 
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
              <Moon size={24} className="mb-2" />
              <span className="text-sm font-semibold">ダーク</span>
            </button>
            <button 
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}
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
            platforms.map((platform, index) => {
              const isConnected = platform.accounts.length > 0;
              
              return (
                <div
                  key={index}
                  className={`flex flex-col p-6 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm hover:shadow-md transition-shadow ${isConnected ? "border-green-200 dark:border-green-900/50" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${platform.color} border ${platform.borderColor} dark:bg-opacity-10 dark:border-opacity-20 flex-shrink-0`}>
                        {platform.icon}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{platform.name}</h3>
                          {platform.disabled && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              準備中
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{platform.description}</p>
                        {(!isConnected) && platform.note && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">📎 {platform.note}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => !platform.disabled && handleConnectClick(platform.id, isConnected)}
                      disabled={connecting !== null || platform.disabled}
                      className={`ml-4 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isConnected
                          ? "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          : `text-white shadow-sm ${platform.accentColor}`
                      }`}
                    >
                      {connecting === platform.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          認証中...
                        </>
                      ) : (
                        <>
                          {isConnected ? <LinkIcon size={16} /> : <LinkIcon size={16} />}
                          {isConnected ? "アカウントを追加" : "連携する"}
                        </>
                      )}
                    </button>
                  </div>

                  {isConnected && (
                    <div className="mt-5 w-full">
                      <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
                        {platform.accounts.map((acc: any, aIdx: number) => (
                           <div key={aIdx} className="flex flex-col py-2 px-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                                 <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                   {(acc as any).accountName || `アカウント (${acc.accountId})`}
                                 </span>
                               </div>
                               <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full select-all">
                                   ID: {acc.accountId}
                                 </span>
                                 <button
                                   onClick={() => handleDisconnect(platform.id, acc.accountId)}
                                   disabled={disconnecting === `${platform.id}:${acc.accountId}`}
                                   className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                                   title="連携を解除する"
                                 >
                                   {disconnecting === `${platform.id}:${acc.accountId}`
                                     ? <Loader2 size={14} className="animate-spin" />
                                     : <X size={14} />}
                                 </button>
                               </div>
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* スコープの説明 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white mb-3">連携時に要求する権限について</h2>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex gap-2"><span className="text-blue-500 dark:text-blue-400 font-mono">pages_manage_posts</span><span>– Facebookページへの投稿</span></div>
            <div className="flex gap-2"><span className="text-blue-500 dark:text-blue-400 font-mono">pages_read_engagement</span><span>– いいね・コメントなどのエンゲージメント読み取り</span></div>
            <div className="flex gap-2"><span className="text-pink-500 dark:text-pink-400 font-mono">instagram_basic</span><span>– Instagramアカウント情報の読み取り</span></div>
            <div className="flex gap-2"><span className="text-pink-500 dark:text-pink-400 font-mono">instagram_content_publish</span><span>– Instagram への画像・動画投稿</span></div>
          </div>
        </div>
      </div>

        {/* Twitter Account Switch Confirm Modal */}
        {twitterConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <AlertCircle className="text-amber-500 w-6 h-6" />
                X (Twitter) の追加連携
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                別のアカウントを連携するには、あらかじめ別のタブでX（旧Twitter）から現在のアカウントを<strong>ログアウト</strong>するか、連携したいアカウントに<strong>切り替えて</strong>おく必要があります。
              </p>
              
              <div className="flex flex-col gap-3">
                <a 
                  href="https://twitter.com/logout" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full text-center px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm"
                >
                  X.com を開いてログアウトする
                </a>
                <button 
                  onClick={() => {
                    setTwitterConfirmOpen(false);
                    handleConnect("twitter");
                  }}
                  className="w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
                >
                  続けて連携する
                </button>
                <button 
                  onClick={() => setTwitterConfirmOpen(false)}
                  className="w-full text-center px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-sm mt-1"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
