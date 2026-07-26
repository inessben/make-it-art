import { defineEventHandler, setHeader } from "h3";

/**
 * The artwork model has no image/media field yet (see backend/prisma/schema.prisma),
 * so there are no per-artwork images to list here. Once artworks expose a real
 * image URL, add an <image:image> entry per artwork/artist the same way the
 * static entries below are built, instead of fabricating placeholder URLs.
 */
interface ArtworkWithImage {
  id: number | string;
  imageUrl?: string | null;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const siteUrl = config.public.siteUrl.replace(/\/$/, "");

  const staticImages = [
    { pageLoc: siteUrl, imageLoc: `${siteUrl}/logo.png`, title: "Make It Art" }
  ];

  let artworkImages: { pageLoc: string; imageLoc: string; title: string }[] = [];

  try {
    const { artworks } = await $fetch<{ artworks: ArtworkWithImage[] }>(
      `${config.apiInternalBase}/artworks`,
      { query: { limit: 80 } }
    );

    artworkImages = (artworks || [])
      .filter((artwork) => Boolean(artwork.imageUrl))
      .map((artwork) => ({
        pageLoc: `${siteUrl}/artworks/${artwork.id}`,
        imageLoc: String(artwork.imageUrl),
        title: `Artwork ${artwork.id}`
      }));
  } catch (error) {
    console.error("sitemap-images.xml: failed to load artworks, listing static images only", error);
  }

  const entries = [...staticImages, ...artworkImages]
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
  return xml;
});
