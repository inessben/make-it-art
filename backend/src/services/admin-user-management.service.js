const prisma = require("../lib/prisma");
const { isAdminUser, isSuperAdminUser } = require("../middlewares/admin-required.middleware");
const { USER_ACCOUNT_STATUS, getUserAccountStatus } = require("../utils/user-account-status");

class AdminUserManagementError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "AdminUserManagementError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const USER_INCLUDE = {
  admin: true,
  artist: true,
  artistApplicationDraft: true
};

function normalizeIpAddress(ipAddress) {
  return typeof ipAddress === "string" && ipAddress.trim() ? ipAddress.trim() : null;
}

async function writeAuditLog(transaction, { actorUser, action, targetUserId, ipAddress }) {
  await transaction.auditLog.create({
    data: {
      userId: actorUser.id,
      action,
      entityType: "USER",
      entityId: String(targetUserId),
      ipAddress: normalizeIpAddress(ipAddress),
      createdAt: new Date()
    }
  });
}

async function findTargetUser(transaction, targetUserId) {
  return transaction.user.findUnique({
    where: {
      id: targetUserId
    },
    include: USER_INCLUDE
  });
}

async function ensureLastSuperAdminGuard(transaction, targetUser) {
  if (!isSuperAdminUser(targetUser)) {
    return;
  }

  const superAdminCount = await transaction.admin.count({
    where: {
      isSuperAdmin: true
    }
  });

  if (superAdminCount <= 1) {
    throw new AdminUserManagementError(
      "LAST_SUPER_ADMIN_REQUIRED",
      "At least one super admin must remain active.",
      409
    );
  }
}

function ensureActorCanManageTarget({ actorUser, targetUser }) {
  if (!targetUser) {
    throw new AdminUserManagementError("USER_NOT_FOUND", "User not found", 404);
  }

  if (actorUser.id === targetUser.id) {
    throw new AdminUserManagementError(
      "SELF_MANAGEMENT_NOT_ALLOWED",
      "You cannot change your own access from this page.",
      409
    );
  }

  if (isAdminUser(targetUser) && !isSuperAdminUser(actorUser)) {
    throw new AdminUserManagementError(
      "SUPER_ADMIN_REQUIRED",
      "Only a super admin can manage another admin account.",
      403
    );
  }
}

function getAccountStatusUpdateData(targetUser, nextStatus) {
  if (nextStatus === USER_ACCOUNT_STATUS.ACTIVE) {
    return {
      blockedAt: null,
      isActive: Boolean(targetUser.verified)
    };
  }

  if (nextStatus === USER_ACCOUNT_STATUS.SUSPENDED) {
    return {
      blockedAt: null,
      isActive: false
    };
  }

  if (nextStatus === USER_ACCOUNT_STATUS.BLOCKED) {
    return {
      blockedAt: new Date(),
      isActive: false
    };
  }

  throw new AdminUserManagementError(
    "INVALID_ACCOUNT_STATUS",
    "Invalid account status update.",
    400
  );
}

async function updateUserAccountStatus({ actorUser, targetUserId, nextStatus, ipAddress }) {
  if (!Object.values(USER_ACCOUNT_STATUS).includes(nextStatus)) {
    throw new AdminUserManagementError(
      "INVALID_ACCOUNT_STATUS",
      "Invalid account status update.",
      400
    );
  }

  return prisma.$transaction(async (transaction) => {
    const targetUser = await findTargetUser(transaction, targetUserId);

    ensureActorCanManageTarget({
      actorUser,
      targetUser
    });

    if (
      [USER_ACCOUNT_STATUS.SUSPENDED, USER_ACCOUNT_STATUS.BLOCKED].includes(nextStatus) &&
      isSuperAdminUser(targetUser)
    ) {
      await ensureLastSuperAdminGuard(transaction, targetUser);
    }

    if (getUserAccountStatus(targetUser) === nextStatus) {
      return targetUser;
    }

    const updatedUser = await transaction.user.update({
      where: {
        id: targetUserId
      },
      data: getAccountStatusUpdateData(targetUser, nextStatus),
      include: USER_INCLUDE
    });

    await writeAuditLog(transaction, {
      actorUser,
      action: `USER_ACCOUNT_${nextStatus.toUpperCase()}`,
      targetUserId,
      ipAddress
    });

    return updatedUser;
  });
}

async function removeAdminAccess({ actorUser, targetUserId, ipAddress }) {
  if (!isSuperAdminUser(actorUser)) {
    throw new AdminUserManagementError(
      "SUPER_ADMIN_REQUIRED",
      "Only a super admin can remove admin access.",
      403
    );
  }

  return prisma.$transaction(async (transaction) => {
    const targetUser = await findTargetUser(transaction, targetUserId);

    ensureActorCanManageTarget({
      actorUser,
      targetUser
    });

    if (!isAdminUser(targetUser)) {
      throw new AdminUserManagementError(
        "USER_NOT_ADMIN",
        "This account does not have admin access.",
        409
      );
    }

    await ensureLastSuperAdminGuard(transaction, targetUser);

    const updatedUser = await transaction.user.update({
      where: {
        id: targetUserId
      },
      data: {
        role: null,
        ...(targetUser.admin
          ? {
              admin: {
                delete: true
              }
            }
          : {})
      },
      include: USER_INCLUDE
    });

    await writeAuditLog(transaction, {
      actorUser,
      action: "USER_ADMIN_ACCESS_REMOVED",
      targetUserId,
      ipAddress
    });

    return updatedUser;
  });
}

async function removeSuperAdminAccess({ actorUser, targetUserId, ipAddress }) {
  if (!isSuperAdminUser(actorUser)) {
    throw new AdminUserManagementError(
      "SUPER_ADMIN_REQUIRED",
      "Only a super admin can remove super admin access.",
      403
    );
  }

  return prisma.$transaction(async (transaction) => {
    const targetUser = await findTargetUser(transaction, targetUserId);

    ensureActorCanManageTarget({
      actorUser,
      targetUser
    });

    if (!isSuperAdminUser(targetUser)) {
      throw new AdminUserManagementError(
        "USER_NOT_SUPER_ADMIN",
        "This account is not a super admin.",
        409
      );
    }

    await ensureLastSuperAdminGuard(transaction, targetUser);

    const updatedUser = await transaction.user.update({
      where: {
        id: targetUserId
      },
      data: {
        admin: {
          update: {
            isSuperAdmin: false
          }
        }
      },
      include: USER_INCLUDE
    });

    await writeAuditLog(transaction, {
      actorUser,
      action: "USER_SUPER_ADMIN_ACCESS_REMOVED",
      targetUserId,
      ipAddress
    });

    return updatedUser;
  });
}

module.exports = {
  AdminUserManagementError,
  removeAdminAccess,
  removeSuperAdminAccess,
  updateUserAccountStatus
};
