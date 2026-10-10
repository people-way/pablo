import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["stockfish"],
  outputFileTracingIncludes: {
    "/api/analyze": ["node_modules/stockfish/bin/**/*"],
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
    ];
  },
};

export default nextConfig;
