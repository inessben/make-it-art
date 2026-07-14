const prisma = require("../lib/prisma");

async function listOrdersForAdmin() {
  return prisma.order.findMany({
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    include: {
      user: true,
      items: true,
      payments: true,
    },
  });
}

module.exports = {
  listOrdersForAdmin,
};
