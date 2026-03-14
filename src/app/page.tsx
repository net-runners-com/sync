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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full point-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 blur-[100px] rounded-full point-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-8">
            <Sparkles size={14} />
            <span>AISNS自動化プラットフォーム Sync</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight max-w-4xl">
            SNS運用を、<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              AIでフルオートメーション。
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            直感的なノードエディタで自動化ワークフローを構築。AIによるコンテンツ生成、スケジューリング、分析まで、すべてのSNSフローをSyncで完結させましょう。
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              無料で試してみる
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
      <section className="py-24 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">複雑な運用を、シンプルに</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              ノーコードのエディタとAIの力を掛け合わせ、運用コストを劇的に削減します。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                <Workflow className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">ノードベースエディタ</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                トリガー、AI生成、SNS投稿などのノードを繋ぐだけで、プログラミング不要で高度な自動化ワークフローが完成します。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
                <Bot className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">高精度なAIアシスト</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                OpenAI統合により、コンテキストに沿った魅力的な投稿文の自動生成や、画像の分析など、クリエイティブをAIがサポートします。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                <BarChart3 className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">クロスプラットフォーム分析</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                X、Facebook、Instagramのインサイトを一元管理。フォロワー推移やエンゲージメント率の変動をダッシュボードで視覚化します。
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
