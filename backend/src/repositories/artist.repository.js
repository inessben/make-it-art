const prisma = require("../lib/prisma");

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

module.exports = {
  listArtistsForAdmin
};
