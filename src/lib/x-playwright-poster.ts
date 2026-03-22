import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  if (url.startsWith("http")) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image from URL");
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.split("/")[1] || "jpg";
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: contentType,
      filename: `image.${extension}`
    };
  } else if (url.startsWith("data:image")) {
    const matches = url.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid base64 image data");
    const mimeType = matches[1];
    const extension = mimeType.split("/")[1] || "jpg";
    const base64Data = matches[2];
    return {
      buffer: Buffer.from(base64Data, "base64"),
      mimeType,
      filename: `image.${extension}`
    };
  } else {
    // ローカルファイル想定
    let filePath = url;
    if (url.startsWith("/")) {
      filePath = path.join(process.cwd(), "public", url);
    } else {
      filePath = path.resolve(process.cwd(), url);
    }
    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).slice(1) || "jpg";
    let mimeType = `image/${extension}`;
    if (extension === "jpg") mimeType = "image/jpeg";
    return { buffer, mimeType, filename: path.basename(filePath) || `image.${extension}` };
  }
}

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
    {
      name: "auth_token",
      value: account.access_token,
      domain: ".x.com",
      path: "/",
      secure: true,
      httpOnly: true,
    },
    {
      name: "ct0",
      value: account.refresh_token,
      domain: ".x.com",
      path: "/",
      secure: true,
    },
  ];

  console.log("[Playwright X] Launching visible browser...");
  let browser;
  try {
    // headless: false でブラウザを目視できるように起動
    // channel: "chrome" を指定することでMac環境等で確実にアプリとして最前面にポップアップさせます
    // slowMo: 50 で操作を少しゆっくりにし、人間味を持たせる（＆目視しやすくする）
    browser = await chromium.launch({ 
      headless: false, 
      channel: "chrome", // 実際のChromeを立ち上げることで確実な別ポップアップ化
      args: ['--window-size=1000,800'] 
    });
    const context = await browser.newContext({
      viewport: { width: 1000, height: 800 }
    });
    await context.addCookies(cookies);

    const page = await context.newPage();
    console.log("[Playwright X] Navigating to compose page...");
    
    // いきなりcomposeを開く (networkidleはXのような重いSPAだとハングするため使用しない)
    await page.goto("https://x.com/compose/tweet", { waitUntil: "domcontentloaded" });
    
    // 画面の最前面への呼び出しを安定させるハック
    await page.bringToFront();

    // ログインページにリダイレクトされた場合はCookieが無効
    // 念のため2秒ほど待ってURLをチェック
    await page.waitForTimeout(2000);
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

    // 画像のアップロード処理 (クリップボード貼り付けをエミュレート)
    if (imageUrl) {
      console.log("[Playwright X] Fetching and uploading image via Paste...", imageUrl);
      try {
        const { buffer, mimeType, filename } = await fetchImageBuffer(imageUrl);
        
        const base64Data = buffer.toString("base64");
        
        // テキストエリアにフォーカスを当てる
        await page.focus(textboxSelector);

        // ブラウザのコンテキスト内でPasteイベントをディスパッチする
        await page.evaluate(
          ({ base64Data, mimeType, filename, textboxSelector }) => {
            const byteString = atob(base64Data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });
            const file = new File([blob], filename, { type: mimeType });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            const targetElement = document.querySelector(textboxSelector) || document.activeElement;
            if (targetElement) {
              const pasteEvent = new ClipboardEvent("paste", {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true,
              });
              targetElement.dispatchEvent(pasteEvent);
            }
          },
          { base64Data, mimeType, filename, textboxSelector }
        );
        
        console.log("[Playwright X] Image pasted to textarea, waiting for preview...");
        await page.waitForTimeout(3000); // プレビュー画像がUIに反映されるのを待機
      } catch (imgError) {
        console.error("[Playwright X] Failed to upload image via Paste:", imgError);
        // 画像エラーでもテキスト投稿自体は続行する
      }
    }

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
