<template>
  <div
    class="grid min-w-0 gap-5 rounded-[24px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:rounded-[28px] sm:p-5"
    aria-hidden="true"
  >
    <div class="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
      <div class="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-slate-800" />
      <div class="h-11 w-full animate-pulse rounded-2xl bg-slate-850 sm:w-28" />
    </div>

    <div class="grid gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="h-6 w-28 animate-pulse rounded-full bg-slate-850" />
        <div class="h-6 w-20 animate-pulse rounded-full bg-slate-850" />
      </div>

      <div class="grid gap-3">
        <div class="h-5 w-3/4 animate-pulse rounded bg-slate-800" />
        <div class="grid gap-2">
          <div class="h-3 w-full animate-pulse rounded bg-slate-850" />
          <div class="h-3 w-5/6 animate-pulse rounded bg-slate-850" />
          <div class="h-3 w-2/3 animate-pulse rounded bg-slate-850" />
        </div>
      </div>
    </div>

    <div class="mt-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="grid gap-2">
        <div class="h-3 w-12 animate-pulse rounded bg-slate-850" />
        <div class="h-4 w-24 animate-pulse rounded bg-slate-800" />
      </div>
      <div class="grid gap-2 sm:justify-items-end">
        <div class="h-3 w-10 animate-pulse rounded bg-slate-850" />
        <div class="h-5 w-16 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  </div>
</template>
