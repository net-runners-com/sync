/**
 * x-insights.ts
 * X(Twitter)インサイト取得ロジック
 *
 * fetchXInsightsDirect: auth_token + ct0 で Twitter 内部APIを直接fetch
 * agent-twitter-client の cookie domain 問題を完全に回避
 */

const X_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

export interface XProfile {
  screenName: string;
  name: string;
  profileImageUrl: string | null;
  followersCount: number | null;
  followingCount: number | null;
  tweetsCount: number | null;
  biography: string | null;
}

export interface XTweetMetrics {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  views: number | null;
  replies: number;
  createdAt: string | null;
}

export interface XInsightsData {
  profile: XProfile;
  recentTweets: XTweetMetrics[];
  fetchedAt: string;
}

/** auth_token + ct0 でTwitter内部APIを直接叩く共通ヘッダ */
function xHeaders(authToken: string, ct0: string) {
  return {
    "Authorization": `Bearer ${X_BEARER}`,
    "Cookie": `auth_token=${authToken}; ct0=${ct0}`,
    "x-csrf-token": ct0,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
  };
}

/** プロフィール＋ツイートを直接fetchで取得 */
export async function fetchXInsightsDirect(
  authToken: string,
  ct0: string
): Promise<XInsightsData> {
  // Twitter WebアプリのSame-Origin内部APIパスを使用
  // api.twitter.com はサーバー側cookie認証を拒否するため twitter.com/i/api を使う
  const BASE = "https://twitter.com/i/api/1.1";

  const headers: Record<string, string> = {
    "Cookie": `auth_token=${authToken}; ct0=${ct0}`,
    "x-csrf-token": ct0,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "Content-Type": "application/json",
    "Referer": "https://twitter.com/",
    "Origin": "https://twitter.com",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  };

  // 1. verify_credentials でプロフィール取得
  const vcRes = await fetch(
    `${BASE}/account/verify_credentials.json?include_entities=false&skip_status=true`,
    { headers }
  );

  if (!vcRes.ok) {
    const body = await vcRes.text();
    throw new Error(`verify_credentials失敗 (${vcRes.status}): ${body.slice(0, 200)}`);
  }

  const vc = await vcRes.json();
  if (vc.errors) {
    throw new Error(`Xセッションエラー: ${JSON.stringify(vc.errors)}`);
  }

  const profile: XProfile = {
    screenName: vc.screen_name ?? "",
    name: vc.name ?? "",
    profileImageUrl: vc.profile_image_url_https?.replace("_normal", "_bigger") ?? null,
    followersCount: vc.followers_count ?? null,
    followingCount: vc.friends_count ?? null,
    tweetsCount: vc.statuses_count ?? null,
    biography: vc.description ?? null,
  };

  // 2. 最近のツイートを取得
  let recentTweets: XTweetMetrics[] = [];
  try {
    const tlRes = await fetch(
      `${BASE}/statuses/user_timeline.json?screen_name=${profile.screenName}&count=10&tweet_mode=extended`,
      { headers }
    );
    if (tlRes.ok) {
      const tweets = await tlRes.json();
      if (Array.isArray(tweets)) {
        recentTweets = tweets.map((t: any) => ({
          id: t.id_str ?? "",
          text: (t.full_text ?? t.text ?? "").slice(0, 200),
          likes: t.favorite_count ?? 0,
          retweets: t.retweet_count ?? 0,
          views: null, // v1.1はviews非対応
          replies: 0,
          createdAt: t.created_at ?? null,
        }));
      }
    }
  } catch {
    // タイムライン取得失敗は無視
  }

  return { profile, recentTweets, fetchedAt: new Date().toISOString() };
}

