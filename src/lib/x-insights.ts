/**
 * x-insights.ts
 * agent-twitter-client を使ったX(Twitter)インサイト取得ロジック
 *
 * 取得できるデータ:
 *   - プロフィール: フォロワー数、フォロー数、ツイート数、アイコン
 *   - 最近のツイート: いいね数、RT数、表示数(views)、返信数
 */
import type { Scraper } from "agent-twitter-client";

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

/** プロフィール取得 */
export async function fetchXProfile(
  scraper: Scraper,
  screenName: string
): Promise<XProfile> {
  const p = await scraper.getProfile(screenName);
  return {
    screenName: p.username ?? screenName,
    name: p.name ?? screenName,
    profileImageUrl: p.avatar ?? null,
    followersCount: p.followersCount ?? null,
    followingCount: p.followingCount ?? null,
    tweetsCount: p.tweetsCount ?? null,
    biography: p.biography ?? null,
  };
}

/** 最近のツイートのエンゲージメントを取得（件数は少なめに抑える）*/
export async function fetchRecentTweetMetrics(
  scraper: Scraper,
  screenName: string,
  limit = 10
): Promise<XTweetMetrics[]> {
  const result: XTweetMetrics[] = [];
  for await (const tweet of scraper.getTweets(screenName, limit)) {
    result.push({
      id: tweet.id ?? "",
      text: (tweet.text ?? "").slice(0, 200),
      likes: tweet.likes ?? 0,
      retweets: tweet.retweets ?? 0,
      views: tweet.views ?? null,
      replies: tweet.replies ?? 0,
      createdAt: tweet.timeParsed?.toISOString() ?? null,
    });
  }
  return result;
}

/** プロフィール＋ツイートメトリクスをまとめて取得 */
export async function fetchXInsights(
  scraper: Scraper,
  screenName: string
): Promise<XInsightsData> {
  const [profile, recentTweets] = await Promise.all([
    fetchXProfile(scraper, screenName),
    fetchRecentTweetMetrics(scraper, screenName, 10),
  ]);
  return {
    profile,
    recentTweets,
    fetchedAt: new Date().toISOString(),
  };
}
