const prisma = require("../lib/prisma");

const ADMIN_AUDIT_ENTITY_TYPES = Object.freeze([
  "USER",
  "ARTIST",
  "ARTIST_APPLICATION",
  "CATEGORY",
  "ARTWORK",
  "ORDER",
  "PAYMENT",
  "ARTIST_WITHDRAWAL",
  "FULFILLMENT_TASK",
  "STRIPE_WEBHOOK_EVENT",
  "PAYMENT_OPERATOR_ALERT",
  "DISPUTE"
]);

const ADMIN_AUDIT_ENTITY_LABELS = Object.freeze({
  USER: "Users",
  ARTIST: "Artists",
  ARTIST_APPLICATION: "Artist applications",
  CATEGORY: "Categories",
  ARTWORK: "Artworks",
  ORDER: "Orders",
  PAYMENT: "Payments",
  ARTIST_WITHDRAWAL: "Artist withdrawals",
  FULFILLMENT_TASK: "Fulfillment tasks",
  STRIPE_WEBHOOK_EVENT: "Stripe webhooks",
  PAYMENT_OPERATOR_ALERT: "Payment alerts",
  DISPUTE: "Disputes"
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAdminAuditEntityType(value) {
  const normalizedValue = normalizeText(value).toUpperCase();

  return ADMIN_AUDIT_ENTITY_TYPES.includes(normalizedValue) ? normalizedValue : "";
}

function isAdminAuditEntityType(value) {
  return Boolean(normalizeAdminAuditEntityType(value));
}

function parseAuditLimit(value, fallbackValue = 120) {
  const parsedValue = Number.parseInt(String(value), 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    return fallbackValue;
  }

  return Math.min(parsedValue, 200);
}

async function listAdminAuditLogs({
  entityType,
  entityId,
  actorUserId,
  actionQuery,
  limit = 120,
  prismaClient = prisma
} = {}) {
  const normalizedEntityType = normalizeAdminAuditEntityType(entityType);
  const normalizedEntityId = normalizeText(entityId);
  const normalizedActionQuery = normalizeText(actionQuery);
  const normalizedActorUserId =
    Number.isSafeInteger(actorUserId) && actorUserId > 0 ? actorUserId : null;
  const take = parseAuditLimit(limit);

  const where = {
    entityType: normalizedEntityType || {
      in: ADMIN_AUDIT_ENTITY_TYPES
    },
    ...(normalizedEntityId ? { entityId: normalizedEntityId } : {}),
    ...(normalizedActorUserId ? { userId: normalizedActorUserId } : {}),
    ...(normalizedActionQuery
      ? {
          action: {
            contains: normalizedActionQuery,
            mode: "insensitive"
          }
        }
      : {})
  };

  const [entries, totalEntries, groupedEntries] = await Promise.all([
    prismaClient.auditLog.findMany({
      where,
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          include: {
            admin: true,
            artist: true
          }
        }
      }
    }),
    prismaClient.auditLog.count({ where }),
    prismaClient.auditLog.groupBy({
      by: ["entityType"],
      where,
      _count: {
        _all: true
      }
    })
  ]);

  return {
    entries,
    totalEntries,
    groupedEntries: groupedEntries
      .map((entry) => ({
        entityType: entry.entityType || "",
        label: ADMIN_AUDIT_ENTITY_LABELS[entry.entityType] || entry.entityType || "Other",
        count: entry._count?._all || 0
      }))
      .sort((leftEntry, rightEntry) => rightEntry.count - leftEntry.count),
    filters: {
      entityType: normalizedEntityType,
      entityId: normalizedEntityId,
      actorUserId: normalizedActorUserId,
      actionQuery: normalizedActionQuery,
      limit: take
    }
  };
}

module.exports = {
  ADMIN_AUDIT_ENTITY_LABELS,
  ADMIN_AUDIT_ENTITY_TYPES,
  isAdminAuditEntityType,
  listAdminAuditLogs,
  normalizeAdminAuditEntityType,
  parseAuditLimit
};
