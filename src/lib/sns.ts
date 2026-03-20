import { prisma } from "./prisma";

// Facebook/Instagram Graph API のベースURL
const FB_GRAPH_API = "https://graph.facebook.com/v19.0";

/**
 * Xのアクセストークンをrefresh_tokenを使って更新し、DBに保存する
 */
async function refreshTwitterToken(accountId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.error("[Twitter] Token refresh failed:", data);
      return null;
    }

    const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in ?? 7200);

    // DBのトークンを更新
    await prisma.account.update({
      where: { id: accountId },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken,
        expires_at: expiresAt,
      },
    });

    console.log("[Twitter] Token refreshed successfully");
    return data.access_token;
  } catch (err) {
    console.error("[Twitter] Token refresh error:", err);
    return null;
  }
}

/**
 * ユーザーのFacebookユーザーアクセストークンから、
 * ページアクセストークンの一覧を取得する
 */
async function getFacebookPageToken(userAccessToken: string): Promise<{ pageId: string; pageToken: string; pageName: string } | null> {
  try {
    const res = await fetch(`${FB_GRAPH_API}/me/accounts?access_token=${userAccessToken}`);
    const data = await res.json();
    
    if (data.error) {
      console.error("Facebook /me/accounts error:", data.error);
      return null;
    }
    
    // 最初のページを使用（複数ページある場合は後でUI側で選択できるようにする）
    const pages = data.data as Array<{ id: string; access_token: string; name: string }>;
    if (!pages || pages.length === 0) {
      console.warn("No Facebook Pages found for this user.");
      return null;
    }
    
    return {
      pageId: pages[0].id,
      pageToken: pages[0].access_token,
      pageName: pages[0].name,
    };
  } catch (error) {
    console.error("Error fetching Facebook page token:", error);
    return null;
  }
}

/**
 * Facebookページに投稿する (Meta Graph API)
 */
async function postToFacebook(userAccessToken: string, message: string, imageUrl?: string | null): Promise<{ success: boolean; postId?: string; pageName?: string; error?: string }> {
  const pageInfo = await getFacebookPageToken(userAccessToken);
  if (!pageInfo) {
    return { success: false, error: "Facebookページが見つかりません。Facebookページを作成してアカウントに連携してください。" };
  }

  const { pageId, pageToken, pageName } = pageInfo;
  
  try {
    const body: Record<string, string> = {
      message,
      access_token: pageToken,
    };
    
    // 画像URLがある場合は添付
    if (imageUrl) {
      body.link = imageUrl;
    }
    
    const res = await fetch(`${FB_GRAPH_API}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    
    if (data.error) {
      console.error("Facebook Post error:", data.error);
      return { success: false, error: data.error.message };
    }
    
    return { success: true, postId: data.id, pageName };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Instagramビジネスアカウントに投稿する (Meta Graph API 2ステップ)
 * 前提: FacebookページにInstagramビジネスアカウントが連携されていること
 */
async function postToInstagram(userAccessToken: string, message: string, imageUrl?: string | null): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  // Step1: Facebookページ経由でInstagramアカウントIDを取得
  const pageInfo = await getFacebookPageToken(userAccessToken);
  if (!pageInfo) {
    return { success: false, error: "Facebookページが見つかりません。Instagramビジネスアカウントに連携されたFacebookページが必要です。" };
  }
  
  const { pageId, pageToken } = pageInfo;

  try {
    // Step2: ページに紐づくInstagramアカウントIDを取得
    const igAccountRes = await fetch(`${FB_GRAPH_API}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`);
    const igAccountData = await igAccountRes.json();
    
    const igUserId = igAccountData.instagram_business_account?.id;
    if (!igUserId) {
      return { success: false, error: "Instagramビジネスアカウントが見つかりません。FacebookページにInstagramを連携してください。" };
    }
    
    // Step3: メディアコンテナを作成
    const containerBody: Record<string, string> = {
      caption: message,
      access_token: pageToken,
    };
    
    // 画像がある場合は画像投稿、ない場合はテキストのみ（Reels等で必要）
    if (imageUrl) {
      containerBody.image_url = imageUrl;
      containerBody.media_type = "IMAGE";
    } else {
      // テキストのみの場合はCareers / BIO更新以外は難しいので注意
      return { success: false, error: "Instagramへの投稿には画像URLが必要です。" };
    }
    
    const createRes = await fetch(`${FB_GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    
    const createData = await createRes.json();
    if (createData.error) {
      return { success: false, error: createData.error.message };
    }
    
    const creationId = createData.id;
    
    // Step4: コンテナを発行（投稿）
    const publishRes = await fetch(`${FB_GRAPH_API}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: pageToken }),
    });
    
    const publishData = await publishRes.json();
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }
    
    return { success: true, mediaId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Threadsアカウントに投稿する (Threads API経由 - 仮実装)
 */
async function postToThreads(userAccessToken: string, message: string, imageUrl?: string | null): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  // 実際のThreads APIは https://graph.threads.net/ を使用し、事前にThreadsプロフィールへの連携が必要になります。
  // ここではInstagram(Facebook)と同じアクセストークンを流用する前提の仮実装とします。
  try {
    const threadsApiUrl = 'https://graph.threads.net/v1.0';
    
    // Step1: ThreadsのユーザーIDを取得
    const meRes = await fetch(`${threadsApiUrl}/me?access_token=${userAccessToken}`);
    const meData = await meRes.json();
    
    if (meData.error) {
       // トークンエラー時はFallbackとしてInstagram向けの連携を促す
       return { success: false, error: "Threadsアカウントが見つかりません。Instagramアカウント経由でThreadsとの連携が必要です: " + meData.error.message };
    }
    
    const threadsUserId = meData.id;
    
    // Step2: Threadsのメディアコンテナを作成
    const containerBody: Record<string, string> = {
      media_type: imageUrl ? "IMAGE" : "TEXT",
      text: message,
      access_token: userAccessToken,
    };
    
    if (imageUrl) {
      containerBody.image_url = imageUrl;
    }
    
    const createRes = await fetch(`${threadsApiUrl}/${threadsUserId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    
    const createData = await createRes.json();
    if (createData.error) {
      return { success: false, error: createData.error.message };
    }
    
    const creationId = createData.id;
    
    // Step3: コンテナを発行（投稿公開）
    const publishRes = await fetch(`${threadsApiUrl}/${threadsUserId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: userAccessToken }),
    });
    
    const publishData = await publishRes.json();
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }
    
    return { success: true, mediaId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * SNSプラットフォームへの投稿メイン関数
 */
export async function postToSNS(
  userId: string,
  platform: "twitter" | "instagram" | "facebook" | "threads",
  message: string,
  imageUrl?: string | null,
  accountId?: string,
  threadTexts?: string[]
): Promise<{ success: boolean; platform: string; data?: any; error?: string }> {
  // DBからユーザーのOAuthアクセストークンを取得
  // Instagramの場合はFacebook経由のトークンを利用、Threadsは独立したthreadsプロバイダーを利用
  const dbProvider = platform === "instagram" ? "facebook" : platform;
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: dbProvider,
      ...(accountId ? { providerAccountId: accountId } : {})
    },
  });

  if (!account || !account.access_token) {
    return {
      success: false,
      platform,
      error: `[${platform}] 認証情報が見つかりません。設定画面から${platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram (Facebook)" : platform === "threads" ? "Threads" : "Twitter"}と連携してください。`,
    };
  }

  // アクセストークンの取得（Twitterは期限切れていれば自動リフレッシュ）
  let accessToken = account.access_token;

  if (platform === "twitter") {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = account.expires_at && account.expires_at < now + 60; // 60秒前のマージン
    if (isExpired && account.refresh_token) {
      console.log("[Twitter] Access token expired, refreshing...");
      const newToken = await refreshTwitterToken(account.id, account.refresh_token);
      if (newToken) {
        accessToken = newToken;
      } else {
        return { success: false, platform, error: "Xのトークンの更新に失敗しました。再度Xアカウントと連携してください。" };
      }
    }
  }

  try {
    switch (platform) {
      case "facebook": {
        const result = await postToFacebook(accessToken, message, imageUrl);
        return {
          success: result.success,
          platform,
          data: { postId: result.postId, pageName: result.pageName },
          error: result.error,
        };
      }
      
      case "instagram": {
        const result = await postToInstagram(accessToken, message, imageUrl);
        return {
          success: result.success,
          platform,
          data: { mediaId: result.mediaId },
          error: result.error,
        };
      }
      
      case "threads": {
        const result = await postToThreads(accessToken, message, imageUrl);
        return {
          success: result.success,
          platform,
          data: { mediaId: result.mediaId },
          error: result.error,
        };
      }
      
      case "twitter": {
        // ⚠️ Twitter Media Upload v1.1 は OAuth 1.0aが必要で Bearer Tokenでは動作しない。
        //    アップロード失敗時は画像なしでツイートする。
        let mediaId: string | undefined;

        if (imageUrl) {
          try {
            const mediaRes = await fetch(imageUrl);
            if (!mediaRes.ok) throw new Error(`画像の取得に失敗: ${mediaRes.status}`);
            const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());
            const base64Media = mediaBuffer.toString("base64");
            const mediaContentType = mediaRes.headers.get("content-type") || "image/jpeg";

            const uploadRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                media_data: base64Media,
                media_category: mediaContentType.startsWith("video") ? "tweet_video" : "tweet_image",
              }),
            });

            // レスポンスが空またはJSONでない場合を安全に処理
            const uploadText = await uploadRes.text();
            if (!uploadText || !uploadText.trim().startsWith("{")) {
              console.warn("[Twitter] Media upload returned non-JSON (OAuth 1.0a required):", uploadRes.status, uploadText.slice(0, 200));
            } else {
              const uploadData = JSON.parse(uploadText);
              if (uploadRes.ok && uploadData.media_id_string) {
                mediaId = uploadData.media_id_string;
                console.log("[Twitter] Media uploaded:", mediaId);
              } else {
                console.warn("[Twitter] Media upload failed:", uploadData);
              }
            }
          } catch (mediaErr) {
            console.warn("[Twitter] Media upload error:", mediaErr);
          }
        }

        const postTweet = async (text: string, replyToId?: string) => {
          const body: any = { text };
          if (mediaId) body.media = { media_ids: [mediaId] };
          if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

          const twitterRes = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const twitterText = await twitterRes.text();
          let twitterData: any;
          try {
            twitterData = JSON.parse(twitterText);
          } catch {
            throw new Error(`Twitter API returned invalid JSON: ${twitterText.slice(0, 200)}`);
          }
          if (!twitterRes.ok || twitterData.errors) {
            const errMsg = twitterData.errors?.[0]?.message || twitterData.detail || "Twitter API error";
            throw new Error(errMsg);
          }
          return twitterData.data;
        };

        // ツリー投稿（スレッド）
        if (threadTexts && threadTexts.length > 0) {
          let lastTweetId: string | undefined;
          const tweetIds: string[] = [];
          for (const text of threadTexts) {
            if (!text.trim()) continue;
            const tweet = await postTweet(text, lastTweetId);
            lastTweetId = tweet.id;
            tweetIds.push(tweet.id);
          }
          return { success: true, platform, data: { tweetIds } };
        }

        // 通常ツイート
        const tweet = await postTweet(message);
        return { success: true, platform, data: tweet };
      }
      
      default:
        return { success: false, platform, error: "サポートされていないプラットフォームです。" };
    }
  } catch (error: any) {
    console.error(`Error posting to ${platform}:`, error);
    return {
      success: false,
      platform,
      error: error.message,
    };
  }
}

/**
 * Facebookページのインサイト（リーチ、エンゲージメント）を取得
 */
export async function getFacebookInsights(userId: string): Promise<any> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "facebook" },
  });
  
  if (!account?.access_token) {
    throw new Error("Facebookアカウントが連携されていません。");
  }
  
  const pageInfo = await getFacebookPageToken(account.access_token);
  if (!pageInfo) throw new Error("Facebookページが見つかりません。");
  
  const { pageId, pageToken } = pageInfo;
  
  const res = await fetch(
    `${FB_GRAPH_API}/${pageId}/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&access_token=${pageToken}`
  );
  const data = await res.json();
  return data;
}

/**
 * Instagramビジネスアカウントのインサイトとプロフィール情報を取得
 */
export async function getInstagramInsights(userId: string): Promise<any> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "facebook" },
  });
  
  if (!account?.access_token) {
    throw new Error("Facebookアカウントが連携されていません（Instagram連携に必要）。");
  }
  
  const pageInfo = await getFacebookPageToken(account.access_token);
  if (!pageInfo) throw new Error("Facebookページが見つかりません。");
  
  const { pageId, pageToken } = pageInfo;
  
  // Instagramアカウント情報取得
  const igRes = await fetch(
    `${FB_GRAPH_API}/${pageId}?fields=instagram_business_account{id,name,username,followers_count,media_count,profile_picture_url}&access_token=${pageToken}`
  );
  const igData = await igRes.json();
  
  const igAccountId = igData.instagram_business_account?.id;
  if (!igAccountId) throw new Error("Instagramビジネスアカウントが見つかりません。");
  
  // メディア一覧とインプレッション取得
  const mediaRes = await fetch(
    `${FB_GRAPH_API}/${igAccountId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=10&access_token=${pageToken}`
  );
  const mediaData = await mediaRes.json();
  
  return {
    account: igData.instagram_business_account,
    recentMedia: mediaData.data,
  };
}
