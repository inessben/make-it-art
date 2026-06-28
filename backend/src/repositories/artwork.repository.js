const prisma = require("../lib/prisma");

async function listArtworksForAdmin() {
  return prisma.artwork.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      category: true,
      artist: {
        include: {
          user: true
        }
      },
      _count: {
        select: {
          favorites: true,
          orderItems: true
        }
      }
    }
  });
}

module.exports = {
  listArtworksForAdmin
};
