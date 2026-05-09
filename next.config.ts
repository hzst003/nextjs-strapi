import type { NextConfig } from "next";

type UploadRemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

function strapiUploadRemotePatterns(): UploadRemotePattern[] {
  const patterns: UploadRemotePattern[] = [
    {
      protocol: "http",
      hostname: "124.220.27.60",
      port: "1337",
      pathname: "/uploads/**",
    },
  ];
  const raw =
    process.env.STRAPI_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_URL;
  if (!raw) return patterns;
  try {
    const u = new URL(raw);
    const protocol = u.protocol === "https:" ? "https" : "http";
    const entry: UploadRemotePattern = {
      protocol,
      hostname: u.hostname,
      pathname: "/uploads/**",
    };
    if (u.port) entry.port = u.port;
    patterns.push(entry);
  } catch {
    // 忽略非法 STRAPI_URL
  }
  return patterns;
}

const nextConfig: NextConfig = {
  // EdgeOne Pages 静态导出（output: 'export'）要求关闭默认优化；SSR 场景下也可避免依赖 /_next/image 在边缘节点的兼容性
  images: {
    unoptimized: true,
    remotePatterns: strapiUploadRemotePatterns(),
  },
};

export default nextConfig;
