const CATEGORY_GROUPS = [
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

function normalizeMarketplaceCategoryKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function resolveMarketplaceCategoryGroupValue(rawValue) {
  const normalized = normalizeMarketplaceCategoryKey(rawValue).replace(/_/g, "-");
  const exact = CATEGORY_GROUPS.find((group) => group.value === normalized);

  if (exact) {
    return exact.value;
  }

  const partial = CATEGORY_GROUPS.find((group) =>
    group.matches.some((match) => normalized.includes(match))
  );

  return partial?.value || "";
}

function categoryLabelFromValue(value) {
  return CATEGORY_GROUPS.find((group) => group.value === value)?.label || "";
}

function formatMarketplaceCategoryLabel(rawValue, fallback = "") {
  const resolved = resolveMarketplaceCategoryGroupValue(rawValue);
  return categoryLabelFromValue(resolved) || String(fallback || "").trim();
}

module.exports = {
  CATEGORY_GROUPS,
  categoryLabelFromValue,
  formatMarketplaceCategoryLabel,
  normalizeMarketplaceCategoryKey,
  resolveMarketplaceCategoryGroupValue
};
