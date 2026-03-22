import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ネイティブバイナリを持つパッケージはバンドルしない
  serverExternalPackages: ["agent-twitter-client", "@roamhq/wrtc", "playwright"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",  // Xのプロフィール画像
      },
    ],
  },
};

export default nextConfig;
