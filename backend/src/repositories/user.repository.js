const prisma = require("../lib/prisma");

async function findByEmail(email) {
  return prisma.user.findFirst({
    where: { email },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function findByOAuthProvider(oauthProvider, oauthSubject) {
  return prisma.user.findFirst({
    where: {
      oauthProvider,
      oauthSubject
    },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function createUser(data) {
  return prisma.user.create({
    data
  });
}

async function createInvitedAdminUser({ username, email, phone, isSuperAdmin }) {
  return prisma.user.create({
    data: {
      username,
      email,
      phone: phone || null,
      role: "admin",
      createdAt: new Date(),
      verified: false,
      isActive: false,
      admin: {
        create: {
          isSuperAdmin: Boolean(isSuperAdmin)
        }
      }
    },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function updateInvitedAdminUser({ userId, username, phone, isSuperAdmin }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      username,
      phone: phone || null,
      role: "admin",
      verified: false,
      isActive: false,
      admin: {
        upsert: {
          update: {
            isSuperAdmin: Boolean(isSuperAdmin)
          },
          create: {
            isSuperAdmin: Boolean(isSuperAdmin)
          }
        }
      }
    },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function createOAuthUser(data) {
  return prisma.user.create({
    data,
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function verifyEmail(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      verified: true,
      isActive: true
    }
  });
}
async function findById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}
async function updatePassword(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: passwordHash
    }
  });
}

async function activateUser(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      verified: true,
      isActive: true
    },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function updateUser(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data,
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function linkOAuthProvider(userId, { oauthProvider, oauthSubject }) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      oauthProvider,
      oauthSubject,
      oauthLinkedAt: new Date(),
      verified: true,
      isActive: true
    },
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true
    }
  });
}

async function listUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      admin: true,
      artist: true,
      artistApplicationDraft: true,
      _count: {
        select: {
          orders: true
        }
      }
    }
  });
}

async function findUserDetailForAdmin(userId) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      include: {
        admin: true,
        artist: {
          include: {
            artworks: {
              take: 8,
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
            _count: {
              select: {
                artworks: true,
                followers: true,
                collections: true
              }
            }
          }
        },
        artistApplicationDraft: {
          include: {
            reviewedByAdmin: {
              include: {
                admin: true
              }
            }
          }
        },
        orders: {
          take: 8,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            items: true,
            payments: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              include: {
                refunds: {
                  orderBy: [{ createdAt: "desc" }, { id: "desc" }]
                }
              }
            }
          }
        },
        personalCollections: {
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
        favorites: {
          take: 8,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            artwork: {
              include: {
                artist: {
                  include: {
                    user: true
                  }
                },
                category: true
              }
            }
          }
        },
        follows: {
          take: 8,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            artist: {
              include: {
                user: true,
                _count: {
                  select: {
                    artworks: true,
                    followers: true,
                    collections: true
                  }
                }
              }
            }
          }
        },
        auditLogs: {
          take: 20,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        _count: {
          select: {
            orders: true,
            personalCollections: true,
            favorites: true,
            follows: true,
            auditLogs: true,
            refundsRequested: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    const accountAuditLogs = await transaction.auditLog.findMany({
      where: {
        entityType: "USER",
        entityId: String(userId)
      },
      take: 20,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: true
      }
    });

    return {
      ...user,
      accountAuditLogs
    };
  });
}

module.exports = {
  findByEmail,
  findByOAuthProvider,
  createOAuthUser,
  createUser,
  createInvitedAdminUser,
  updateInvitedAdminUser,
  verifyEmail,
  findById,
  updatePassword,
  activateUser,
  updateUser,
  linkOAuthProvider,
  listUsersForAdmin,
  findUserDetailForAdmin
};
