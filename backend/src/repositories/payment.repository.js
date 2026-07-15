const prisma = require("../lib/prisma");

async function listPaymentsForAdmin() {
  return prisma.payment.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      order: {
        include: {
          user: true
        }
      }
    }
  });
}

module.exports = {
  listPaymentsForAdmin
};
