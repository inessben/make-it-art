export const MARKETPLACE_CATEGORY_GROUPS = [
  {
    value: "digital-illustrations",
    label: "Digital Illustrations",
    matches: [
      "illustration",
      "digital illustration",
      "peinture numerique",
      "digital art",
      "digital arts"
    ]
  },
  {
    value: "assets-graphics",
    label: "Assets Graphics",
    matches: [
      "asset",
      "assets",
      "graphic",
      "graphics",
      "graphic design",
      "vector",
      "vector art",
      "art generatif",
      "collage",
      "mix media",
      "mixed media",
      "art 3d",
      "3d",
      "animation",
      "motion"
    ]
  },
  {
    value: "photography",
    label: "Photography",
    matches: ["photographie", "photographies", "photography", "photo"]
  }
];

export function normalizeMarketplaceCategoryKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function categoryLabelFromValue(value) {
  return MARKETPLACE_CATEGORY_GROUPS.find((group) => group.value === value)?.label || "";
}

export function resolveMarketplaceCategoryGroupValue(rawValue) {
  const normalized = normalizeMarketplaceCategoryKey(rawValue).replace(/_/g, "-");
  const exact = MARKETPLACE_CATEGORY_GROUPS.find((group) => group.value === normalized);

  if (exact) {
    return exact.value;
  }

  const partial = MARKETPLACE_CATEGORY_GROUPS.find((group) =>
    group.matches.some((match) => normalized.includes(match))
  );

  return partial?.value || "";
}

export function buildMarketplaceCategorySelection(rawValue) {
  const resolved = resolveMarketplaceCategoryGroupValue(rawValue);
  return resolved ? [resolved] : [];
}

export function resolveArtworkCategoryGroup(artwork) {
  const categoryName = normalizeMarketplaceCategoryKey(artwork?.category?.name);
  const artistType = normalizeMarketplaceCategoryKey(artwork?.artist?.artType);
  const title = normalizeMarketplaceCategoryKey(artwork?.title);

  const sourcesByPriority = [categoryName, artistType, title];

  for (const source of sourcesByPriority) {
    if (!source) {
      continue;
    }

    const found = MARKETPLACE_CATEGORY_GROUPS.find((group) =>
      group.matches.some((match) => source.includes(match))
    );

    if (found) {
      return found.value;
    }
  }

  return MARKETPLACE_CATEGORY_GROUPS[0].value;
}
