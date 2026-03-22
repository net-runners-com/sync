import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0",
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read tweet.write users.read offline.access",
          response_type: "code",
        },
      },
      token: {
        url: "https://api.twitter.com/2/oauth2/token",
      },
      userinfo: {
        url: "https://api.twitter.com/2/users/me",
        params: { "user.fields": "id,name,profile_image_url,username" },
        request: async ({ provider, tokens }: any) => {
          const res = await fetch("https://api.twitter.com/2/users/me?user.fields=id,name,profile_image_url,username", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const { data } = await res.json();
          return data;
        },
      },
      profile(profile: any) {
        return {
          id: profile.id,
          name: profile.name,
          image: profile.profile_image_url,
          email: profile.email ?? null,
        };
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      authorization: {
        params: {
          // Meta/Facebook Graph API で必要な権限スコープ
          scope: [
            "public_profile",
            "email",
            "pages_manage_posts",
            "pages_read_engagement",
            "pages_show_list",
            "instagram_basic",
            "instagram_content_publish",
          ].join(","),
        },
      },
    }),
    {
      id: "threads",
      name: "Threads",
      type: "oauth",
      clientId: process.env.THREADS_CLIENT_ID || "",
      clientSecret: process.env.THREADS_CLIENT_SECRET || "",
      authorization: {
        url: "https://threads.net/oauth/authorize",
        params: {
          scope: "threads_basic,threads_content_publish",
          response_type: "code",
        },
      },
      token: {
        url: "https://graph.threads.net/oauth/access_token",
        async request({ client, params, checks, provider }: any) {
          // Threads API: POSTでcode_verifierなしの通常フロー
          const body = new URLSearchParams({
            client_id: provider.clientId as string,
            client_secret: provider.clientSecret as string,
            grant_type: "authorization_code",
            redirect_uri: params.redirect_uri,
            code: params.code,
          });
          const res = await fetch("https://graph.threads.net/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          const tokens = await res.json();
          return { tokens };
        },
      },
      userinfo: {
        url: "https://graph.threads.net/v1.0/me",
        params: { fields: "id,username,name,threads_profile_picture_url,threads_biography" },
        async request({ tokens }: any) {
          const res = await fetch(
            `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${tokens.access_token}`
          );
          return res.json();
        },
      },
      profile(profile: any) {
        return {
          id: profile.id,
          name: profile.username || profile.name || "Threads User",
          email: null,
          image: profile.threads_profile_picture_url || null,
        };
      },
    },
  ],
  // 本番環境でOAuth state cookieが消える問題を防ぐ
  // Facebook等のOAuthはリダイレクト時にSameSite=Lax cookieが破棄されるため
  ...(process.env.NODE_ENV === "production" && {
    cookies: {
      pkceCodeVerifier: {
        name: "next-auth.pkce.code_verifier",
        options: {
          httpOnly: true,
          sameSite: "none" as const,
          path: "/",
          secure: true,
        },
      },
      state: {
        name: "next-auth.state",
        options: {
          httpOnly: true,
          sameSite: "none" as const,
          path: "/",
          secure: true,
        },
      },
      callbackUrl: {
        name: "next-auth.callback-url",
        options: {
          httpOnly: true,
          sameSite: "none" as const,
          path: "/",
          secure: true,
        },
      },
    },
  }),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && profile) {
        try {
          // Twitterの場合は usernameまたはname、Facebook/InstaやGoogleは name を fallback として保存
          const accountName = (profile as any).username || profile.name || (profile as any).email || "Unknown Account";
          
          // 非同期でアカウント名（ユーザー名）を session_state に保存する
          // NextAuth が DB に Account を作成・更新した後に反映されるよう、少し遅延させる
          setTimeout(async () => {
            try {
              await prisma.account.updateMany({
                where: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
                data: {
                  session_state: accountName,
                },
              });
            } catch (updateErr) {
              console.error("Failed to update account name in session_state", updateErr);
            }
          }, 2000);
          
        } catch (e) {
          console.error("Failed to extract profile name", e);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
  },
};
