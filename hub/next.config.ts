import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { hubRewrites } from "./lib/upstreams";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The repo root has its own lockfile. Keep this app's module graph inside hub/.
  turbopack: { root },
  async rewrites() {
    return hubRewrites();
  },
};

export default nextConfig;
