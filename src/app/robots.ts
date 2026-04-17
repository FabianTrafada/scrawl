import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    host: "https://scrawl.site",
    sitemap: "https://scrawl.site/sitemap.xml",
  };
}
