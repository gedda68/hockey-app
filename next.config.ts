//import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
