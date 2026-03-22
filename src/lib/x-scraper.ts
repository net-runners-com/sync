/**
 * x-scraper.ts
 * agent-twitter-client の Scraper インスタンスを
 * DBから取得した Cookie で初期化して返すユーティリティ
 */
import { Scraper } from "agent-twitter-client";
import { prisma } from "@/lib/prisma";

export type XCookies = {
  authToken: string;
  ct0: string;
};

/** DBからログインユーザーのXクッキーを取得 */
export async function getXCookies(userId: string): Promise<XCookies | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "twitter" },
    select: { access_token: true, refresh_token: true },
  });
  if (!account?.access_token) return null;
  return {
    authToken: account.access_token,
    ct0: account.refresh_token ?? "",
  };
}

/** Cookie認証済みの Scraper を返す */
export async function createXScraper(cookies: XCookies): Promise<Scraper> {
  const scraper = new Scraper();
  // tough-cookie互換のstring形式(Set-Cookie形式)で渡す
  await scraper.setCookies([
    `auth_token=${cookies.authToken}; Domain=.twitter.com; Path=/`,
    `ct0=${cookies.ct0}; Domain=.twitter.com; Path=/`,
    `auth_token=${cookies.authToken}; Domain=.x.com; Path=/`,
    `ct0=${cookies.ct0}; Domain=.x.com; Path=/`,
  ]);
  return scraper;
}
