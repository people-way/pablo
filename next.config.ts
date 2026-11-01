import type { NextConfig } from "next";
import { BASE_PATH, legacyRedirects } from "./lib/paths";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  serverExternalPackages: ["stockfish"],
  outputFileTracingIncludes: {
    "/api/analyze": ["node_modules/stockfish/bin/**/*"],
  },
  async redirects() {
    return legacyRedirects();
  },
  async headers() {
    return [
      {
        source: "/engine/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/sw.js",
        basePath: false,
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
