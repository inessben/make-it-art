const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

let prisma;
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({ adapter });
  }

  prisma = global.__prisma;
}

module.exports = prisma;
