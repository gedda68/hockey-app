//import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Remote club logos used by imported data (next/image needs each host listed)
    remotePatterns: [
      // Altius (hockeybrisbane.altius.live) — logos of clubs created by the Altius import
      { protocol: "https", hostname: "hockey-cdn.altius.live", pathname: "/**" },
      // Brisbane Hockey Association website (Revolutionise CDN) — BHA club logos
      { protocol: "https", hostname: "cdn.revolutionise.com.au", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      // CDN-friendly caching for uploaded media (immutable filenames).
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
