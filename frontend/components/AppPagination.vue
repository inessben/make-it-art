<template>
  <nav
    class="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-5"
    aria-label="Pagination"
  >
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center border border-slate-800 bg-slate-950 transition-colors hover:border-violet-700 disabled:cursor-not-allowed disabled:opacity-30"
      :disabled="currentPage === 1"
      aria-label="Previous page"
      @click="goToPage(currentPage - 1)"
    >
      ‹
    </button>

    <template v-for="item in displayedPages" :key="item.key">
      <span v-if="item.type === 'ellipsis'" class="px-1 text-slate-500" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="flex h-10 min-w-10 items-center justify-center border px-3 transition-colors"
        :class="
          item.page === currentPage
            ? 'border-violet-700 bg-slate-950 text-violet-400'
            : 'border-transparent text-slate-400 hover:border-slate-800 hover:text-slate-100'
        "
        :aria-label="`Go to page ${item.page}`"
        :aria-current="item.page === currentPage ? 'page' : undefined"
        @click="goToPage(item.page)"
      >
        {{ item.page }}
      </button>
    </template>

    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center border border-slate-800 bg-slate-950 transition-colors hover:border-violet-700 disabled:cursor-not-allowed disabled:opacity-30"
      :disabled="currentPage === normalizedTotalPages"
      aria-label="Next page"
      @click="goToPage(currentPage + 1)"
    >
      ›
    </button>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "#app";

const props = defineProps({
  totalPages: { type: Number, default: 24 }
});

const route = useRoute();
const router = useRouter();
const normalizedTotalPages = computed(() => Math.max(1, Math.trunc(Number(props.totalPages) || 1)));
const currentPage = computed(() => {
  const parsedPage = Number.parseInt(String(route.query.page || "1"), 10);
  const validPage = Number.isInteger(parsedPage) ? parsedPage : 1;
  return Math.min(Math.max(validPage, 1), normalizedTotalPages.value);
});

const displayedPages = computed(() => {
  const total = normalizedTotalPages.value;
  if (total <= 7)
    return Array.from({ length: total }, (_, index) => ({
      type: "page",
      page: index + 1,
      key: `page-${index + 1}`
    }));

  const pages = new Set([1, total]);
  const start = Math.max(2, currentPage.value - 1);
  const end = Math.min(total - 1, currentPage.value + 1);

  if (currentPage.value <= 3) {
    pages.add(2);
    pages.add(3);
  } else if (currentPage.value >= total - 2) {
    pages.add(total - 2);
    pages.add(total - 1);
  } else {
    for (let page = start; page <= end; page += 1) pages.add(page);
  }

  const orderedPages = [...pages].sort((left, right) => left - right);
  const items = [];
  orderedPages.forEach((page, index) => {
    if (index > 0 && page - orderedPages[index - 1] > 1)
      items.push({ type: "ellipsis", key: `ellipsis-${page}` });
    items.push({ type: "page", page, key: `page-${page}` });
  });
  return items;
});

async function goToPage(page) {
  const nextPage = Math.min(Math.max(Math.trunc(page), 1), normalizedTotalPages.value);
  if (nextPage === currentPage.value) return;

  const query = { ...route.query };
  if (nextPage === 1) delete query.page;
  else query.page = String(nextPage);

  await router.push({ path: route.path, query });
  if (import.meta.client) window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>
