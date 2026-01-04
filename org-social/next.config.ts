import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    proxyClientMaxBodySize: "50mb", // for the banner image upload
  },
};

export default nextConfig;
