import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nxlxwsmzyjtuzzckeksw.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      },
    ],
  },
};

export default nextConfig;
