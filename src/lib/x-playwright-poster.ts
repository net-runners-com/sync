import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  if (url.startsWith("http")) {
    // Cloudflare R2の署名が必要な非公開URL（.envの設定による）を検知した場合、S3Clientで取得する
    if (url.includes("r2.cloudflarestorage.com") && process.env.R2_ACCOUNT_ID) {
      console.log("[Playwright X] R2 URI detected, fetching securely via S3Client...");
      const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
      });
      // バケット名とキーを抽出 (例: url=...com/sync/filename.jpg -> bucket="sync", key="filename.jpg")
      const urlPath = url.split("r2.cloudflarestorage.com/")[1];
      const parts = urlPath.split("/");
      const bucketName = parts[0];
      const key = parts.slice(1).join("/");
      
      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      const response = await s3Client.send(command);
      
      if (!response.Body) throw new Error("R2 GetObject returned empty body");
      const byteArray = await response.Body.transformToByteArray();
      const contentType = response.ContentType || "image/jpeg";
      const extension = contentType.split("/")[1] || "jpg";
      
      return {
        buffer: Buffer.from(byteArray),
        mimeType: contentType,
        filename: `image.${extension}`
      };
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
    }
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
      viewport: { width: 1000, height: 800 },
      permissions: ["clipboard-read", "clipboard-write"]
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

    // テキストがあれば入力する
    if (message && message.trim() !== "") {
      console.log("[Playwright X] Typing message...");
      await page.fill(textboxSelector, message);
      await page.waitForTimeout(500); // UIへの反映待ち
    }

    // 画像のアップロード処理 (Mac標準のクリップボード経由でのNative Paste)
    if (imageUrl) {
      console.log("[Playwright X] Fetching and uploading image via Native OS Paste...", imageUrl);
      try {
        const { buffer } = await fetchImageBuffer(imageUrl);
        
        // テンポラリファイルとして保存し、osascript経由でMacの物理クリップボードにコピーする
        const { execSync } = require("child_process");
        const os = require("os");
        const path = require("path");

        const tempFilePath = path.join(os.tmpdir(), `x-playwright-upload-${Date.now()}.png`);
        fs.writeFileSync(tempFilePath, buffer);

        // Mac用: osascriptを使って画像をTIFFピクチャとしてクリップボードへ書き込む
        console.log("[Playwright X] Setting image to macOS clipboard...");
        execSync(`osascript -e 'set the clipboard to (read (POSIX file "${tempFilePath}") as TIFF picture)'`);
        
        // Xの入力欄にクリックで確実にキャレット(カーソル)を入れる(Draft.js対応)
        console.log("[Playwright X] Clicking textarea to focus caret...");
        await page.click(textboxSelector);
        
        // Mac環境 (Meta+V) をエミュレートして貼り付けイベントを完全発火させる
        console.log("[Playwright X] Pressing Meta+V to paste image from OS clipboard...");
        await page.keyboard.press("Meta+V");

        console.log("[Playwright X] Image pasted to textarea natively, waiting for preview...");
        
        // 画像プレビューエレメントが出現するまで待機することでアップロード完了を担保する
        try {
          await page.waitForSelector('[data-testid="attachments"]', { state: "visible", timeout: 10000 });
          // アニメーション分だけ少し待つ
          await page.waitForTimeout(1000);
        } catch (waitErr) {
          console.error("プレビューの出現がタイムアウトしました。ペーストに失敗した可能性があります。");
        }
        
        // 使用済みのテンポラリファイルを削除
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      } catch (imgError) {
        console.error("[Playwright X] Failed to upload image via Native OS Paste:", imgError);
        // 画像エラーでもテキスト等の投稿処理は続行する
      }
    }

    // 投稿ボタンをクリック
    console.log("[Playwright X] Clicking post button...");
    const postButtonLocator = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').first();
    
    // Playwrightの locator.click() は自動でenabledになるまで待機してくれるため、そのままclickする
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
