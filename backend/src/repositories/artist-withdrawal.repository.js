const prisma = require("../lib/prisma");

const artistWithdrawalInclude = {
  artist: {
    include: {
      user: true
    }
  },
  requestedBy: {
    select: {
      id: true,
      username: true,
      email: true
    }
  },
  reviewedBy: {
    select: {
      id: true,
      username: true,
      email: true
    }
  }
};

async function listWithdrawalsForArtist(
  artistId,
  { limit = 50, statuses, prismaClient = prisma } = {}
) {
  return prismaClient.artistWithdrawal.findMany({
    where: {
      artistId,
      ...(Array.isArray(statuses) && statuses.length > 0 ? { status: { in: statuses } } : {})
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: artistWithdrawalInclude
  });
}

async function summarizeWithdrawalsForArtist(artistId, { prismaClient = prisma } = {}) {
  return prismaClient.artistWithdrawal.groupBy({
    by: ["status"],
    where: { artistId },
    _sum: { amount: true },
    _count: { _all: true }
  });
}

async function createWithdrawal({
  artistId,
  requestedByUserId,
  amount,
  currency = "EUR",
  note,
  prismaClient = prisma
}) {
  return prismaClient.artistWithdrawal.create({
    data: {
      artistId,
      requestedByUserId,
      amount,
      currency,
      note: note || null
    },
    include: artistWithdrawalInclude
  });
}

async function findWithdrawalForArtist({ artistId, publicId, prismaClient = prisma }) {
  return prismaClient.artistWithdrawal.findFirst({
    where: {
      artistId,
      publicId
    },
    include: artistWithdrawalInclude
  });
}

async function findWithdrawalForAdmin(publicId, { prismaClient = prisma } = {}) {
  return prismaClient.artistWithdrawal.findUnique({
    where: { publicId },
    include: artistWithdrawalInclude
  });
}

async function listWithdrawalsForAdmin({ limit = 100, statuses, prismaClient = prisma } = {}) {
  return prismaClient.artistWithdrawal.findMany({
    where: {
      ...(Array.isArray(statuses) && statuses.length > 0 ? { status: { in: statuses } } : {})
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: artistWithdrawalInclude
  });
}

async function updateWithdrawal({ withdrawalId, data, prismaClient = prisma }) {
  return prismaClient.artistWithdrawal.update({
    where: { id: withdrawalId },
    data,
    include: artistWithdrawalInclude
  });
}

module.exports = {
  listWithdrawalsForArtist,
  summarizeWithdrawalsForArtist,
  createWithdrawal,
  findWithdrawalForArtist,
  findWithdrawalForAdmin,
  listWithdrawalsForAdmin,
  updateWithdrawal
};
