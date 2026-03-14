import { prisma } from "./prisma";

// Facebook/Instagram Graph API のベースURL
const FB_GRAPH_API = "https://graph.facebook.com/v19.0";

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
 * SNSプラットフォームへの投稿メイン関数
 */
export async function postToSNS(
  userId: string,
  platform: "twitter" | "instagram" | "facebook",
  message: string,
  imageUrl?: string | null
): Promise<{ success: boolean; platform: string; data?: any; error?: string }> {
  // DBからユーザーのOAuthアクセストークンを取得
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: platform === "instagram" ? "facebook" : platform, // InstagramはFacebook経由で認証
    },
  });

  if (!account || !account.access_token) {
    return {
      success: false,
      platform,
      error: `[${platform}] 認証情報が見つかりません。設定画面から${platform === "facebook" ? "Facebook" : platform === "instagram" ? "Instagram (Facebook)" : "Twitter"}と連携してください。`,
    };
  }

  const accessToken = account.access_token;

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
      
      case "twitter": {
        // Twitter API v2 POST /2/tweets
        const twitterRes = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: message }),
        });
        
        const twitterData = await twitterRes.json();
        
        if (!twitterRes.ok || twitterData.errors) {
          const errMsg = twitterData.errors?.[0]?.message || twitterData.detail || "Twitter API error";
          return { success: false, platform, error: errMsg };
        }
        
        return {
          success: true,
          platform,
          data: twitterData.data,
        };
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
