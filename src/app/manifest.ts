import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scrawl — Freeform Whiteboard with LaTeX",
    short_name: "Scrawl",
    description:
      "Draw, sketch, and write math on a freeform whiteboard with instant LaTeX rendering.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#faf9f7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
