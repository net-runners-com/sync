import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";

export async function postToTwitterWithPlaywright(
  userId: string,
  message: string,
  imageUrl?: string | null,
  threadTexts?: string[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  // DBからCookieセッションを取得
  const account = await prisma.account.findFirst({
    where: { userId, provider: "twitter", scope: "cookie-auth" },
  });

  if (!account || !account.access_token || !account.refresh_token) {
    return {
      success: false,
      error: "XのCookie認証情報が見つかりません。設定からXアカウントと再連携してください。",
    };
  }

  const cookies = [
    {
      name: "auth_token",
      value: account.access_token,
      domain: ".twitter.com",
      path: "/",
      secure: true,
      httpOnly: true,
    },
    {
      name: "ct0",
      value: account.refresh_token,
      domain: ".twitter.com",
      path: "/",
      secure: true,
    },
  ];

  console.log("[Playwright X] Launching visible browser...");
  let browser;
  try {
    // headless: false でブラウザを目視できるように起動
    // slowMo: 50 で操作を少しゆっくりにし、人間味を持たせる（＆目視しやすくする）
    browser = await chromium.launch({ headless: false, slowMo: 50 });
    const context = await browser.newContext();
    await context.addCookies(cookies);

    const page = await context.newPage();
    console.log("[Playwright X] Navigating to compose page...");
    
    // いきなりcomposeを開く
    await page.goto("https://x.com/compose/tweet");

    // ログインページにリダイレクトされた場合はCookieが無効
    await page.waitForLoadState('networkidle');
    if (page.url().includes("login")) {
      await browser.close();
      return { success: false, error: "Xのセッション（Cookie）が失効しています。再連携してください。" };
    }

    // ツイート入力欄が表示されるまで待機
    console.log("[Playwright X] Waiting for tweet input area...");
    const textboxSelector = '[data-testid="tweetTextarea_0"]';
    await page.waitForSelector(textboxSelector, { timeout: 15000 });

    // メッセージを入力
    console.log("[Playwright X] Typing message...");
    await page.fill(textboxSelector, message);

    // TODO: 画像投稿とスレッド対応は一旦基本の投稿が成功することを確認してから拡張する
    // 今回は最もシンプルなテキスト投稿の動作確認を優先します

    // 投稿ボタンをクリック
    console.log("[Playwright X] Clicking post button...");
    const postButtonLocator = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').first();
    await postButtonLocator.waitFor({ state: 'visible' });
    await postButtonLocator.click();

    // ツイート完了（URLがホームに戻るか、Toastが表示されるのを待機）
    console.log("[Playwright X] Waiting for completion...");
    await page.waitForTimeout(4000); // 投稿アニメーション完了を待つ

    await browser.close();
    return { success: true, data: { status: "Playwright Posted Successfully" } };

  } catch (error: any) {
    console.error("[Playwright X] Error:", error);
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}
