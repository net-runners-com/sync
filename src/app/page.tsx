import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Sparkles, ArrowRight, Bot, Zap, Share2, BarChart3, Workflow, Shield } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="text-white" size={18} />
            </div>
            <span className="text-xl font-bold tracking-tight">Sync</span>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <Link 
                href="/dashboard"
                className="text-sm font-medium hover:text-white text-slate-300 transition-colors"
              >
                ダッシュボードへ戻る
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium hover:text-white text-slate-300 transition-colors"
              >
                ログイン
              </Link>
            )}
            
            <Link
              href={session ? "/dashboard" : "/login"}
              className="px-4 py-2 rounded-lg bg-white text-slate-950 text-sm font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              {session ? "ダッシュボードを開く" : "無料で始める"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-56 lg:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-screen">
        {/* Background Mesh Gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Abstract floating nodes background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-40 left-[10%] w-32 h-32 border border-slate-700 rounded-3xl rotate-12 bg-slate-800/20 backdrop-blur-xl" />
          <div className="absolute bottom-40 right-[15%] w-48 h-48 border border-slate-700 rounded-full -rotate-12 bg-slate-800/20 backdrop-blur-xl" />
          <div className="absolute top-1/3 right-[20%] w-24 h-24 border border-purple-500/30 rounded-2xl rotate-45 bg-purple-500/5 backdrop-blur-xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-md text-slate-300 text-xs font-semibold mb-10 shadow-xl">
            <Sparkles size={14} className="text-purple-400" />
            <span className="tracking-wide">次世代型ワークフローオートメーション</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl xl:text-8xl font-black tracking-tighter mb-8 leading-[1.1] max-w-5xl">
            想像を、<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 via-purple-300 to-white">
              自動で結線する。
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mb-14 leading-relaxed font-light">
            無限のキャンバスにアイデアを配置するだけ。面倒なSNS運用やクリエイティブ制作のワークフローが、一つの画面で完結します。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-20"></div>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="relative px-8 py-4 rounded-xl bg-white text-slate-950 font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2 hover:-translate-y-1"
            >
              ワークスペースを開く
              <ArrowRight size={20} />
            </Link>
            {!session && (
              <Link
                href="/login"
                className="px-8 py-4 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-300 font-bold text-lg hover:bg-slate-800 transition-all"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>

        {/* Browser Mockup Image / Illustration */}
        <div className="max-w-6xl mx-auto mt-20 px-6 relative z-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-2xl overflow-hidden">
            <div className="h-12 border-b border-slate-800 flex items-center px-4 gap-2 bg-slate-900">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="aspect-[16/9] w-full bg-[#0f172a] relative overflow-hidden flex items-center justify-center p-8">
              {/* Concept UI mockup inside the browser */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
              
              <div className="relative flex items-center gap-6">
                <div className="w-48 p-4 rounded-xl border border-slate-700 bg-slate-800 shadow-xl flex flex-col gap-3 z-10">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Bot size={20} />
                    <span className="font-semibold text-sm">AI生成ノード</span>
                  </div>
                  <div className="text-xs text-slate-400">トレンドから自動でツイートを生成します。</div>
                </div>

                <div className="h-0.5 w-16 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-purple-400 bg-slate-900" />
                </div>

                <div className="w-48 p-4 rounded-xl border border-purple-500/50 bg-slate-800 shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col gap-3 z-10">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Share2 size={20} />
                    <span className="font-semibold text-sm">マルチSNS投稿</span>
                  </div>
                  <div className="text-xs text-slate-400">X, Facebook, IGへ一括で送信し、分析。</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-950 relative border-t border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight">限界のないキャンバス。</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg lg:text-xl font-light">
              直感的なノードエディタが、複雑なフローを美しく可視化します。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.04] transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-8 border border-blue-500/30 group-hover:scale-110 transition-transform">
                <Workflow className="text-blue-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">ノードコネクション</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                アクションを繋ぐだけで処理が連鎖。ドラッグ＆ドロップの美しいUIが、あなたの思考を妨げません。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.04] transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-8 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Sparkles className="text-purple-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">スマートアシスト</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                コンテキストを理解する生成AIが、文章作成から画像生成までクリエイティブな作業を強力にバックアップします。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.04] transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-8 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <BarChart3 className="text-emerald-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">インサイトトラッキング</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                すべてのアカウントのパフォーマンスを一つのダッシュボードで統合。美しい高コントラストグラフで成果を追跡します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="text-purple-500" size={20} />
            <span className="text-xl font-bold tracking-tight">Sync</span>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Sync All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
