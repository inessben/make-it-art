const prisma = require("../lib/prisma");
const { PREDEFINED_ARTWORK_CATEGORIES } = require("../constants/artwork-categories");
const { ARTWORK_MODERATION_STATUS } = require("../constants/artwork-moderation-status");

function sortCategoriesByPredefinedOrder(categories) {
  const orderMap = new Map(
    PREDEFINED_ARTWORK_CATEGORIES.map((name, index) => [String(name).toLowerCase(), index])
  );

  return [...categories].sort((left, right) => {
    const leftOrder =
      orderMap.get(String(left.name || "").toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder =
      orderMap.get(String(right.name || "").toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

async function ensurePredefinedCategories() {
  const categories = [];

  for (const name of PREDEFINED_ARTWORK_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name
      }
    });

    if (existing) {
      categories.push(existing);
      continue;
    }

    categories.push(
      await prisma.category.create({
        data: {
          name
        }
      })
    );
  }

  return categories;
}

function buildArtworkCountSelection(publicOnly = false) {
  if (!publicOnly) {
    return true;
  }

  return {
    where: {
      moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED,
      artist: {
        verified: true
      }
    }
  };
}

async function listCategories({ publicOnly = false } = {}) {
  const ensuredCategories = await ensurePredefinedCategories();
  const categoryIds = ensuredCategories.map((category) => category.id);

  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: categoryIds
      }
    },
    include: {
      _count: {
        select: {
          artworks: buildArtworkCountSelection(publicOnly)
        }
      }
    }
  });

  return sortCategoriesByPredefinedOrder(categories);
}

async function listCategoriesForAdmin() {
  return listCategories();
}

async function findById(categoryId) {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }

  return prisma.category.findUnique({
    where: {
      id: categoryId
    }
  });
}

async function isPredefinedCategory(categoryId) {
  const categories = await ensurePredefinedCategories();

  return categories.some((category) => category.id === categoryId);
}

async function updateCategoryImage({ categoryId, imagePath }) {
  return prisma.category.update({
    where: {
      id: categoryId
    },
    data: {
      imagePath: imagePath || null
    },
    include: {
      _count: {
        select: {
          artworks: true
        }
      }
    }
  });
}

module.exports = {
  ensurePredefinedCategories,
  listCategories,
  listCategoriesForAdmin,
  findById,
  isPredefinedCategory,
  updateCategoryImage
};
