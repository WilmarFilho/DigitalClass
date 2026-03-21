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
    ],
  },
};

export default nextConfig;
