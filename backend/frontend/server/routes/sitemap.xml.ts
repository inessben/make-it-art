import { defineEventHandler, setHeader } from "h3";

interface ArtworkSummary {
  id: number | string;
  createdAt: string | null;
}

interface ArtistSummary {
  id: number | string;
  createdAt: string | null;
}

function toIsoDate(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = [
    urlEntry(siteUrl, today, "daily", "1.0"),
    urlEntry(`${siteUrl}/artworks`, today, "daily", "0.9"),
    urlEntry(`${siteUrl}/artists`, today, "daily", "0.9"),
    urlEntry(`${siteUrl}/about-us`, today, "monthly", "0.5"),
    urlEntry(`${siteUrl}/terms`, today, "yearly", "0.3"),
    urlEntry(`${siteUrl}/privacy`, today, "yearly", "0.3"),
    urlEntry(`${siteUrl}/cookies`, today, "yearly", "0.3")
  ];

  let dynamicEntries: string[] = [];

  try {
    const [artworksResponse, artistsResponse] = await Promise.all([
      $fetch<{ artworks: ArtworkSummary[] }>(`${config.apiInternalBase}/artworks`, {
        query: { limit: 80 }
      }),
      $fetch<{ artists: ArtistSummary[] }>(`${config.apiInternalBase}/artists`, {
        query: { limit: 60 }
      })
    ]);

    dynamicEntries = [
      ...(artworksResponse.artworks || []).map((artwork) =>
        urlEntry(`${siteUrl}/artworks/${artwork.id}`, toIsoDate(artwork.createdAt), "weekly", "0.7")
      ),
      ...(artistsResponse.artists || []).map((artist) =>
        urlEntry(`${siteUrl}/artists/${artist.id}`, toIsoDate(artist.createdAt), "weekly", "0.7")
      )
    ];
  } catch (error) {
    console.error(
      "sitemap.xml: failed to load marketplace data, falling back to static pages only",
      error
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...dynamicEntries].join("\n")}
</urlset>`;

  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  return xml;
});
