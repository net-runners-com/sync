import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 | Sync",
  description: "Syncの利用規約です。サービスをご利用いただく前にご確認ください。",
};

export default function TermsPage() {
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
            利用規約
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            最終更新日: {lastUpdated}
          </p>
        </div>

        {/* 本文 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col gap-8 text-slate-700 dark:text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第1条（適用）</h2>
            <p>
              本利用規約（以下「本規約」）は、Sync（以下「本サービス」）の利用条件を定めるものです。
              登録ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。
              本サービスを利用した時点で、本規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第2条（サービス内容）</h2>
            <p>
              本サービスは、ソーシャルメディア（X / Instagram / Facebook / Threads / note 等）への
              投稿をワークフローとして自動化するプラットフォームです。
              ユーザーはノードベースのエディターを使い、コンテンツ生成・スケジュール・投稿を自動化できます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第3条（アカウント登録）</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>本サービスの利用にはアカウント登録が必要です。</li>
              <li>登録はGoogleアカウント等のソーシャルログインにより行います。</li>
              <li>虚偽の情報による登録は禁止します。</li>
              <li>アカウントの管理はユーザー自身の責任で行ってください。第三者による不正使用の責任は負いかねます。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第4条（禁止事項）</h2>
            <p className="mb-2">ユーザーは以下の行為を行ってはなりません。</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスのサーバー・ネットワークへの過度な負荷をかける行為</li>
              <li>各SNSプラットフォームの利用規約に違反する投稿・自動化</li>
              <li>スパム・フィッシング・なりすまし等の行為</li>
              <li>第三者の権利（著作権・商標権・プライバシー権等）を侵害する行為</li>
              <li>本サービスの運営を妨げる行為</li>
              <li>他のユーザーに不利益・損害・不快感を与える行為</li>
              <li>反社会的勢力への利益供与</li>
              <li>その他、運営が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第5条（SNS連携と外部プラットフォーム）</h2>
            <p className="mb-2">
              本サービスでは、X・Instagram・Facebook・Threads・note 等の外部SNSプラットフォームと連携します。
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>各プラットフォームの利用規約・APIポリシーを遵守してご利用ください。</li>
              <li>プラットフォームのポリシー変更により、機能が制限・停止される場合があります。</li>
              <li>投稿内容・自動化による各プラットフォームでのアカウント停止等の責任は負いかねます。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第6条（知的財産権）</h2>
            <p>
              本サービスのシステム・デザイン・コンテンツに関する知的財産権は、
              運営または正当な権利者に帰属します。
              ユーザーが投稿・アップロードしたコンテンツの著作権はユーザーに帰属しますが、
              サービス提供に必要な範囲で使用を許諾するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第7条（サービスの変更・停止）</h2>
            <p>
              運営は、ユーザーへの事前通知なく、本サービスの内容を変更・停止・終了することがあります。
              これによってユーザーに生じた損害について、運営は責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第8条（免責事項）</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>本サービスは現状有姿で提供されます。特定目的への適合性・完全性・正確性を保証しません。</li>
              <li>本サービスの利用によって生じた損害について、運営の故意・重過失による場合を除き、責任を負いません。</li>
              <li>外部SNSプラットフォームの障害・仕様変更による影響については責任を負いません。</li>
              <li>AI生成コンテンツの内容・正確性について、保証しません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第9条（有料プランと料金）</h2>
            <p>
              本サービスには無料プランおよび有料プランがあります。
              有料プランの料金・支払い条件はサービス内の料金ページに記載します。
              支払いはStripeを通じて処理します。
              契約の解約は設定画面からいつでも行うことができます。
              解約後も当該月の期間終了まではサービスを利用できます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第10条（アカウント削除）</h2>
            <p>
              ユーザーはいつでもアカウント削除を申請できます。
              削除後はデータの復元はできません。
              運営は、禁止事項に違反したユーザーのアカウントを、事前通知なく削除・停止することができます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第11条（規約の変更）</h2>
            <p>
              運営は必要に応じて本規約を変更することができます。
              重要な変更がある場合はサービス内でお知らせします。
              変更後に本サービスを継続して利用した場合、変更後の規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第12条（準拠法・管轄裁判所）</h2>
            <p>
              本規約の解釈は日本法に準拠します。
              本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">第13条（お問い合わせ）</h2>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
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
          <Link href="/privacy-policy" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </div>
  );
}
