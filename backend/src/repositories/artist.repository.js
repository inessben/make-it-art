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

async function updateArtistVerification({ artistId, verified, prismaClient = prisma }) {
  return prismaClient.artist.update({
    where: { id: artistId },
    data: {
      verified
    },
    include: includeArtistProfile()
  });
}

async function findArtistDetailForAdmin(artistId) {
  const artistRecord = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      userId: true
    }
  });

  if (!artistRecord?.userId) {
    return null;
  }

  await syncArtistCollectionsOwnership(artistRecord.userId);

  return prisma.$transaction(async (transaction) => {
    const artist = await transaction.artist.findUnique({
      where: { id: artistId },
      include: {
        user: {
          include: {
            admin: true,
            artistApplicationDraft: {
              include: {
                reviewedByAdmin: {
                  include: {
                    admin: true
                  }
                }
              }
            }
          }
        },
        artworks: {
          take: 12,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            category: true,
            _count: {
              select: {
                favorites: true,
                orderItems: true
              }
            }
          }
        },
        collections: {
          take: 8,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            _count: {
              select: {
                items: true
              }
            }
          }
        },
        followers: {
          take: 12,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            user: true
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

    if (!artist) {
      return null;
    }

    const auditEntityFilters = [
      {
        entityType: "ARTIST",
        entityId: String(artist.id)
      },
      ...(artist.user?.artistApplicationDraft
        ? [
            {
              entityType: "ARTIST_APPLICATION",
              entityId: String(artist.user.artistApplicationDraft.id)
            }
          ]
        : [])
    ];

    const [recentSales, soldItemsCount, auditLogs] = await Promise.all([
      transaction.orderItem.findMany({
        where: {
          artwork: {
            artistId
          }
        },
        take: 10,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          artwork: {
            select: {
              id: true,
              title: true,
              category: {
                select: {
                  name: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              publicId: true,
              status: true,
              currency: true,
              totalAmount: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        }
      }),
      transaction.orderItem.count({
        where: {
          artwork: {
            artistId
          }
        }
      }),
      auditEntityFilters.length > 0
        ? transaction.auditLog.findMany({
            where: {
              OR: auditEntityFilters
            },
            take: 30,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: {
              user: {
                include: {
                  admin: true,
                  artist: true
                }
              }
            }
          })
        : []
    ]);

    return {
      ...artist,
      recentSales,
      soldItemsCount,
      auditLogs
    };
  });
}

module.exports = {
  findByUserId,
  saveArtistApplication,
  listArtistsForAdmin,
  updateArtistVerification,
  findArtistDetailForAdmin
};
