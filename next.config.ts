import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["probe-image-size"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "www.artic.edu" },
      { protocol: "https", hostname: "api.artic.edu" },
      { protocol: "https", hostname: "www.moma.org" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.rijksmuseum.nl" },
    ],
  },
};

export default nextConfig;
