import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "124.220.27.60",
        port: "1337",
        pathname: "/uploads/**",
      },

    ],
  },
};

export default nextConfig;
