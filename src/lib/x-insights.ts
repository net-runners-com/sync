/**
 * x-insights.ts
 * X(Twitter)インサイト取得ロジック
 *
 * fetchXInsightsDirect: auth_token + ct0 で Twitter 内部APIを直接fetch
 * agent-twitter-client の cookie domain 問題を完全に回避
 */

const X_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

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

/** 最近のツイートのエンゲージメントを取得 */
export async function fetchRecentTweetMetrics(
  scraper: Scraper,
  screenName: string,
  limit = 10
): Promise<XTweetMetrics[]> {
  const result: XTweetMetrics[] = [];
  try {
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
  } catch {
    // タイムライン取得失敗は無視する
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
