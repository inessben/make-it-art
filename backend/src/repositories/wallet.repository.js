const prisma = require("../lib/prisma");

function findLatestConsent(userId) {
  return prisma.walletConsent.findFirst({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
}
function createConsent(data) {
  return prisma.walletConsent.create({ data });
}
function findByIdForUser(id, userId) {
  return prisma.wallet.findFirst({ where: { id, userId } });
}
function findByIdempotencyKey(idempotencyKey) {
  return prisma.wallet.findUnique({ where: { idempotencyKey } });
}
function findActiveEmbeddedWallet(userId) {
  return prisma.wallet.findFirst({
    where: {
      userId,
      provider: "COINBASE_CDP",
      network: "BASE",
      origin: "EMBEDDED",
      status: "ACTIVE"
    }
  });
}
function listForUser(userId) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
}
function createPending({ userId, idempotencyKey, consentedAt }) {
  return prisma.wallet.create({
    data: {
      userId,
      provider: "COINBASE_CDP",
      network: "BASE",
      origin: "EMBEDDED",
      status: "PENDING",
      idempotencyKey,
      consentedAt
    }
  });
}
function activate({ id, address }) {
  return prisma.wallet.update({
    where: { id },
    data: { address: address.toLowerCase(), status: "ACTIVE", lastErrorCode: null }
  });
}
function markFailed({ id, errorCode }) {
  return prisma.wallet.update({
    where: { id },
    data: { status: "RETRY_REQUIRED", lastErrorCode: errorCode }
  });
}
function prepareRetry(id) {
  return prisma.wallet.update({ where: { id }, data: { status: "PENDING", lastErrorCode: null } });
}

module.exports = {
  activate,
  createConsent,
  createPending,
  findActiveEmbeddedWallet,
  findByIdForUser,
  findByIdempotencyKey,
  findLatestConsent,
  listForUser,
  markFailed,
  prepareRetry
};
