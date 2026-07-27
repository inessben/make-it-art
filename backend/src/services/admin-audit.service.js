function normalizeAuditText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAuditEntityId(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeIpAddress(ipAddress) {
  const normalizedValue = normalizeAuditText(ipAddress);

  return normalizedValue || null;
}

const SENSITIVE_AUDIT_KEY_PATTERN =
  /(?:secret|password|token|authorization|cookie|card|cvc|iban|client.?secret|payment.?method)/i;

function sanitizeAuditMetadata(value, depth = 0) {
  if (depth > 5 || value === undefined) {
    return null;
  }

  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeAuditMetadata(item, depth + 1));
  }

  if (typeof value !== "object") {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_AUDIT_KEY_PATTERN.test(key))
      .slice(0, 50)
      .map(([key, item]) => [key.slice(0, 100), sanitizeAuditMetadata(item, depth + 1)])
  );
}

function normalizeCorrelationId(value) {
  const normalizedValue = normalizeAuditText(value);
  return /^[A-Za-z0-9_-]{8,64}$/.test(normalizedValue) ? normalizedValue : null;
}

async function writeAdminAuditLog(
  prismaClient,
  {
    actorUser,
    actorUserId,
    action,
    entityType,
    entityId,
    ipAddress,
    correlationId,
    metadata,
    createdAt = new Date()
  }
) {
  const normalizedAction = normalizeAuditText(action).toUpperCase();
  const normalizedEntityType = normalizeAuditText(entityType).toUpperCase();
  const normalizedEntityId = normalizeAuditEntityId(entityId);
  const resolvedActorUserId = Number.isSafeInteger(actorUserId)
    ? actorUserId
    : Number.isSafeInteger(actorUser?.id)
      ? actorUser.id
      : null;
  const sanitizedMetadata = sanitizeAuditMetadata(metadata);

  if (!normalizedAction || !normalizedEntityType || !normalizedEntityId) {
    throw new Error("INVALID_ADMIN_AUDIT_LOG");
  }

  return prismaClient.auditLog.create({
    data: {
      userId: resolvedActorUserId,
      action: normalizedAction,
      entityType: normalizedEntityType,
      entityId: normalizedEntityId,
      ipAddress: normalizeIpAddress(ipAddress),
      correlationId: normalizeCorrelationId(correlationId),
      ...(sanitizedMetadata === null ? {} : { metadata: sanitizedMetadata }),
      createdAt
    }
  });
}

module.exports = {
  normalizeCorrelationId,
  normalizeIpAddress,
  sanitizeAuditMetadata,
  writeAdminAuditLog
};
