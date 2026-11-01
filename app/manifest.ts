import type { MetadataRoute } from "next";
import { BASE_PATH, withBasePath } from "@/lib/paths";

/**
 * The installed app opens the review tool. That is the screen Hugo uses on a
 * phone; the marketing page stays reachable inside the same /pablo scope.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pablo",
    short_name: "Pablo",
    description: "Revue de partie, avec Stockfish dans le navigateur.",
    id: withBasePath("/revue"),
    start_url: withBasePath("/revue"),
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#0a0b0c",
    theme_color: "#0a0b0c",
    lang: "fr",
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-maskable-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: withBasePath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
