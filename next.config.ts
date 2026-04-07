import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["probe-image-size"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
