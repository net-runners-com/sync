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

  // tough-cookie の Cookie クラスで両ドメインに設定
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Cookie } = require("tough-cookie");

  const makeCookie = (key: string, value: string, domain: string) =>
    new Cookie({ key, value, domain, path: "/", secure: true, httpOnly: true });

  await scraper.setCookies([
    makeCookie("auth_token", cookies.authToken, "twitter.com"),
    makeCookie("ct0",        cookies.ct0,        "twitter.com"),
    makeCookie("auth_token", cookies.authToken, "x.com"),
    makeCookie("ct0",        cookies.ct0,        "x.com"),
    makeCookie("auth_token", cookies.authToken, ".twitter.com"),
    makeCookie("ct0",        cookies.ct0,        ".twitter.com"),
    makeCookie("auth_token", cookies.authToken, ".x.com"),
    makeCookie("ct0",        cookies.ct0,        ".x.com"),
  ]);

  return scraper;
}
