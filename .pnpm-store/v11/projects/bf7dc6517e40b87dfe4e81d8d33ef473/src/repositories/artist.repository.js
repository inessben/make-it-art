const prisma = require("../lib/prisma");
const { syncArtistCollectionsOwnership } = require("./collector.repository");

function includeArtistProfile() {
  return {
    user: {
      include: {
        admin: true,
        artist: true
      }
    },
    _count: {
      select: {
        artworks: true,
        followers: true,
        collections: true
      }
    }
  };
}

async function findByUserId(userId) {
  await syncArtistCollectionsOwnership(userId);

  return prisma.artist.findUnique({
    where: { userId },
    include: includeArtistProfile()
  });
}

async function saveArtistApplication({ userId, displayName, bio }) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        bio
      }
    });

    return tx.artist.upsert({
      where: { userId },
      create: {
        userId,
        displayName,
        verified: false,
        createdAt: new Date()
      },
      update: {
        displayName
      },
      include: includeArtistProfile()
    });
  });
}

async function listArtistsForAdmin() {
  return prisma.artist.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      user: {
        include: {
          admin: true
        }
      },
      _count: {
        select: {
          artworks: true,
          followers: true,
          collections: true
        }
      }
    }
  });
}

async function updateArtistVerification({ artistId, verified }) {
  return prisma.artist.update({
    where: { id: artistId },
    data: {
      verified
    },
    include: includeArtistProfile()
  });
}

module.exports = {
  findByUserId,
  saveArtistApplication,
  listArtistsForAdmin,
  updateArtistVerification
};
