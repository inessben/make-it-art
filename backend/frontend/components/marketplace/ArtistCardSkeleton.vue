<template>
  <div
    class="grid min-w-0 gap-5 rounded-[24px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:rounded-[28px] sm:p-6"
    aria-hidden="true"
  >
    <div class="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <div class="h-14 w-14 shrink-0 animate-pulse rounded-full bg-slate-800" />
        <div class="grid gap-2">
          <div class="h-5 w-32 animate-pulse rounded bg-slate-800" />
          <div class="h-3 w-20 animate-pulse rounded bg-slate-850" />
        </div>
      </div>
      <div class="h-11 w-full animate-pulse rounded-2xl bg-slate-850 sm:w-28" />
    </div>

    <div class="grid gap-2">
      <div class="h-3 w-full animate-pulse rounded bg-slate-850" />
      <div class="h-3 w-5/6 animate-pulse rounded bg-slate-850" />
    </div>

    <div class="flex flex-wrap gap-2">
      <div class="h-6 w-16 animate-pulse rounded-full bg-slate-850" />
      <div class="h-6 w-20 animate-pulse rounded-full bg-slate-850" />
      <div class="h-6 w-14 animate-pulse rounded-full bg-slate-850" />
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div
        v-for="index in 3"
        :key="index"
        class="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3"
      >
        <div class="h-3 w-14 animate-pulse rounded bg-slate-850" />
        <div class="mt-3 h-5 w-8 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  </div>
</template>
