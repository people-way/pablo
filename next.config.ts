import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["stockfish"],
  outputFileTracingIncludes: {
    "/api/analyze": ["node_modules/stockfish/bin/**/*"],
  },
};

export default nextConfig;
