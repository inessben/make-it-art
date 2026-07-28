import { defineEventHandler, setHeader } from "h3";

/**
 * Artwork binaries are intentionally excluded from the image sitemap to reduce
 * automated discovery/scraping of artist works. Only brand assets are listed.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, "");

  const staticImages = [
    { pageLoc: siteUrl, imageLoc: `${siteUrl}/logo.png`, title: "Make It Art" }
  ];

  const entries = staticImages
    .map(
      (entry) => `  <url>
    <loc>${entry.pageLoc}</loc>
    <image:image>
      <image:loc>${entry.imageLoc}</image:loc>
      <image:title>${entry.title}</image:title>
    </image:image>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}
</urlset>`;

  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "X-Robots-Tag", "noai, noimageai");
  return xml;
});
