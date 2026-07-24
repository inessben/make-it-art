const argon2 = require("argon2");
const prisma = require("../lib/prisma");
const env = require("../config/env");

const DEFAULT_ADMIN_USERNAME = "Admin";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isMissingTableError(error) {
  return error?.code === "P2021";
}

async function ensureDefaultAdminAccount() {
  if (!env.defaultAdmin.enabled) {
    return null;
  }

  if (!env.defaultAdmin.email || !env.defaultAdmin.password) {
    console.warn("[bootstrap] default admin seeding skipped: missing credentials");
    return null;
  }

  const normalizedEmail = normalizeEmail(env.defaultAdmin.email);
  const passwordHash = await argon2.hash(env.defaultAdmin.password);

  try {
    const user = await prisma.user.upsert({
      where: {
        email: normalizedEmail
      },
      update: {
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash,
        role: "admin",
        verified: true,
        isActive: true
      },
      create: {
        username: DEFAULT_ADMIN_USERNAME,
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        createdAt: new Date(),
        verified: true,
        isActive: true
      }
    });

    await prisma.admin.upsert({
      where: {
        userId: user.id
      },
      update: {},
      create: {
        userId: user.id
      }
    });

    console.log(`[bootstrap] default admin ready: ${normalizedEmail}`);

    if (env.defaultAdmin.bypassLoginCode) {
      console.log(
        `[bootstrap] dev admin login enabled: ${normalizedEmail} / ${env.defaultAdmin.password}`
      );
    }

    return user;
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[bootstrap] default admin seeding skipped: database tables not ready yet");
      return null;
    }

    throw error;
  }
}

module.exports = {
  ensureDefaultAdminAccount
};
