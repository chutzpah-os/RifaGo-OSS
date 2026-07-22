import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The admin can paste any external image URL for the raffle/prize photo
    // (e.g. Unsplash), but next/image only optimizes hosts explicitly
    // allowed here — add more entries if another photo host is used later.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
