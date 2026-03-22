import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Sync",
  description: "Syncのプライバシーポリシーです。個人情報の取り扱いについてご確認ください。",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "2026年3月22日";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-6 inline-flex items-center gap-1"
          >
            ← ホームに戻る
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mt-4">
            プライバシーポリシー
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            最終更新日: {lastUpdated}
          </p>
        </div>

        {/* 本文 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col gap-8 text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. はじめに</h2>
            <p>
              Sync（以下「本サービス」）は、ソーシャルメディアのワークフロー自動化を提供するサービスです。
              本プライバシーポリシーは、お客様の個人情報の取り扱いについて説明します。
              本サービスをご利用いただくことで、本ポリシーに同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. 収集する情報</h2>
            <p className="mb-2">本サービスでは、以下の情報を収集します。</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>アカウント情報:</strong> Googleアカウントなどのソーシャルログインを通じた氏名・メールアドレス・プロフィール画像</li>
              <li><strong>SNS連携情報:</strong> X (Twitter)・Instagram・Facebook・Threadsのアクセストークン（投稿・操作の実行に使用）</li>
              <li><strong>ワークフローデータ:</strong> お客様が作成したノード・エッジ・自動化設定の内容</li>
              <li><strong>アップロードファイル:</strong> 投稿に使用する画像・動画ファイル（Cloudflare R2に保存）</li>
              <li><strong>実行ログ:</strong> ワークフロー実行時の成功・失敗の記録</li>
              <li><strong>利用状況:</strong> アクセスログ・エラーログ等のサービス改善目的のデータ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. 情報の利用目的</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>本サービスの提供・運営・改善</li>
              <li>ワークフローの自動実行（SNSへの投稿など）</li>
              <li>問い合わせ対応・サポート</li>
              <li>不正利用の検知・防止</li>
              <li>サービスに関するお知らせの送信</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. 第三者提供</h2>
            <p className="mb-2">
              お客様の個人情報は、以下の場合を除き、第三者に提供しません。
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく開示が必要な場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
            <p className="mt-3 text-sm">
              なお、本サービスはサービス提供にあたり以下の外部サービスを利用します。
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Supabase（データベース）</li>
              <li>Cloudflare R2（ファイルストレージ）</li>
              <li>Inngest（バックグラウンド処理）</li>
              <li>OpenRouter / Google（AI機能）</li>
              <li>Stripe（決済）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. SNSアクセストークンの管理</h2>
            <p>
              SNS連携に際して取得するアクセストークンは、暗号化した状態でデータベースに保存し、
              お客様が設定したワークフローの自動実行以外の目的には使用しません。
              お客様はいつでも設定画面から連携を解除し、トークンを削除することができます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. データの保存期間</h2>
            <p>
              お客様のデータは、アカウント削除のご要望があるまで保持します。
              アカウント削除後は、法令上の保存義務がある場合を除き、速やかに削除します。
              実行ログは最大90日間保存されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">7. Cookieの使用</h2>
            <p>
              本サービスはセッション管理のためにCookieを使用します。
              ブラウザの設定によりCookieを無効にすることができますが、
              その場合、ログイン機能など一部のサービスが正常に動作しない場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">8. お客様の権利</h2>
            <p className="mb-2">お客様はご自身の個人情報について以下の権利を持ちます。</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>開示請求:</strong> 保有している個人情報の内容の開示</li>
              <li><strong>訂正・追加・削除:</strong> 不正確な個人情報の訂正または削除</li>
              <li><strong>利用停止:</strong> 個人情報の利用・第三者提供の停止</li>
            </ul>
            <p className="mt-3 text-sm">
              これらのご要望については、下記のお問い合わせ先までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">9. セキュリティ</h2>
            <p>
              お客様の個人情報を保護するため、適切な技術的・組織的安全管理措置を講じています。
              ただし、インターネット上での完全なセキュリティを保証することはできません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">10. プライバシーポリシーの変更</h2>
            <p>
              本ポリシーは必要に応じて改定することがあります。
              重要な変更がある場合は、本サービス上でお知らせします。
              改定後のポリシーは本ページに掲載した時点から有効となります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">11. お問い合わせ</h2>
            <p>
              プライバシーポリシーに関するお問い合わせは、下記までご連絡ください。
            </p>
            <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Sync 運営事務局</p>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                お問い合わせフォームまたはメールにてご連絡ください。
              </p>
            </div>
          </section>
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-slate-400 dark:text-slate-600">
          <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
            トップページへ戻る
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
            利用規約
          </Link>
        </div>
      </div>
    </div>
  );
}
