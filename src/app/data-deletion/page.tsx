import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ユーザーデータ削除 | Sync",
  description: "Syncのユーザーデータ削除リクエストページです。",
};

// Meta の data deletion callback から confirmation_code が渡される場合もある
export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = searchParams.code;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
          {code ? (
            // Metaのコールバックから来た場合 - 削除確認画面
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-6">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-3">
                データ削除を受け付けました
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6">
                ご登録の情報は削除されました。ご不明な点があればお問い合わせください。
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">確認コード</p>
                <p className="font-mono text-slate-800 dark:text-slate-200 break-all">{code}</p>
              </div>
            </>
          ) : (
            // 通常のアクセス - 削除方法の案内
            <>
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-6">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-3">
                ユーザーデータ削除
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6">
                Syncに登録したすべてのデータを削除するには、以下の手順をご確認ください。
              </p>

              <div className="flex flex-col gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">
                    方法①：設定画面から削除（推奨）
                  </p>
                  <ol className="text-sm text-slate-500 dark:text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Syncにログインする</li>
                    <li>設定 → アカウント → 「アカウント削除」</li>
                    <li>確認後、すべてのデータが削除されます</li>
                  </ol>
                  <Link
                    href="/dashboard/settings"
                    className="mt-3 inline-block text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    設定画面へ →
                  </Link>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">
                    方法②：メールでリクエスト
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    以下の情報を添えてお問い合わせください。
                  </p>
                  <ul className="text-sm text-slate-500 dark:text-slate-400 mt-2 space-y-1 list-disc list-inside">
                    <li>登録メールアドレスまたはFacebook/X ID</li>
                    <li>「データ削除希望」の旨</li>
                  </ul>
                </div>

                <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">削除されるデータ</p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-0.5 list-disc list-inside text-xs">
                    <li>アカウント情報（氏名・メールアドレス）</li>
                    <li>SNS連携トークン（Facebook・Instagram・X・Threads）</li>
                    <li>作成したワークフロー・実行ログ</li>
                    <li>アップロードしたファイル</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/privacy-policy"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
