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

async function writeAdminAuditLog(
  prismaClient,
  { actorUser, actorUserId, action, entityType, entityId, ipAddress, createdAt = new Date() }
) {
  const normalizedAction = normalizeAuditText(action).toUpperCase();
  const normalizedEntityType = normalizeAuditText(entityType).toUpperCase();
  const normalizedEntityId = normalizeAuditEntityId(entityId);
  const resolvedActorUserId = Number.isSafeInteger(actorUserId)
    ? actorUserId
    : Number.isSafeInteger(actorUser?.id)
      ? actorUser.id
      : null;

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
      createdAt
    }
  });
}

module.exports = {
  normalizeIpAddress,
  writeAdminAuditLog
};
