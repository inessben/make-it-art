const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

async function getArtistProfile(user) {
  const artist = await prisma.artist.findUnique({
    where: { userId: user.id },
    include: {
      artworks: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      collections: true,
      followers: true
    }
  });

  if (!artist) {
    return null;
  }

  return {
    id: artist.id,
    displayName: artist.displayName || user.username || "Artiste",
    verified: Boolean(artist.verified),
    artworkCount: artist.artworks.length,
    collectionCount: artist.collections.length,
    followerCount: artist.followers.length,
    about: user.bio || "",
    artworks: artist.artworks.map((artwork) => ({
      id: artwork.id,
      title: artwork.title || "Untitled",
      priceTokens: artwork.priceTokens || "0",
      createdAt: artwork.createdAt,
      favoriteCount: artwork.favoriteCount || 0
    }))
  };
}

router.get("/artist/me", authRequired, async (req, res) => {
  try {
    let artistProfile = await getArtistProfile(req.user);

    if (!artistProfile) {
      await prisma.artist.create({
        data: {
          userId: req.user.id,
          displayName: req.user.username || null
        }
      });

      artistProfile = await getArtistProfile(req.user);
    }

    return res.status(200).json({ artist: artistProfile });
  } catch (error) {
    console.error("Artist profile load error:", error);
    return res.status(500).json({ message: "Unable to load artist profile" });
  }
});

router.patch("/artist/me", authRequired, async (req, res) => {
  try {
    const { displayName, bio } = req.body;
    const updates = {};

    if (displayName !== undefined) {
      updates.displayName = displayName;
    }

    if (bio !== undefined) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { bio }
      });
    }

    let artist = await prisma.artist.findUnique({
      where: { userId: req.user.id }
    });

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          userId: req.user.id,
          displayName: updates.displayName || req.user.username || null
        }
      });
    } else if (Object.keys(updates).length > 0) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: updates
      });
    }

    const artistProfile = await getArtistProfile(req.user);

    return res.status(200).json({ artist: artistProfile });
  } catch (error) {
    console.error("Artist profile update error:", error);
    return res.status(500).json({ message: "Unable to update artist profile" });
  }
});

module.exports = router;
