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
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }
      if (account) {
        // アクセストークンとプロバイダー情報をJWTに保存
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
