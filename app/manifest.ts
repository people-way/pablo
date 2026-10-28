import type { MetadataRoute } from "next";

/**
 * The installed app opens the review tool. That is the screen Hugo uses on a
 * phone; the marketing page at / stays reachable inside the same scope.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pablo",
    short_name: "Pablo",
    description: "Revue de partie, avec Stockfish dans le navigateur.",
    id: "/revue",
    start_url: "/revue",
    scope: "/",
    display: "standalone",
    background_color: "#0a0b0c",
    theme_color: "#0a0b0c",
    lang: "fr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
