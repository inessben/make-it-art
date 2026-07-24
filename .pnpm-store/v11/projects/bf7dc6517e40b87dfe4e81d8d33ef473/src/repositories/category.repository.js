const prisma = require("../lib/prisma");
const {
  PREDEFINED_ARTWORK_CATEGORIES,
} = require("../constants/artwork-categories");

async function ensurePredefinedCategories() {
  const categories = [];

  for (const name of PREDEFINED_ARTWORK_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name,
      },
    });

    if (existing) {
      categories.push(existing);
      continue;
    }

    categories.push(
      await prisma.category.create({
        data: {
          name,
        },
      }),
    );
  }

  return categories;
}

async function listCategories() {
  return ensurePredefinedCategories();
}

async function findById(categoryId) {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }

  return prisma.category.findUnique({
    where: {
      id: categoryId,
    },
  });
}

async function isPredefinedCategory(categoryId) {
  const categories = await ensurePredefinedCategories();

  return categories.some((category) => category.id === categoryId);
}

module.exports = {
  ensurePredefinedCategories,
  listCategories,
  findById,
  isPredefinedCategory,
};
