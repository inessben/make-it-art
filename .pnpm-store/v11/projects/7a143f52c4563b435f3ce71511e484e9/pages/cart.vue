<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Panier</p>
          <h1 class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white">
            Récapitulatif
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Ajoutez / retirez des oeuvres, puis passez au checkout. (Le paiement réel n'est pas
            encore branché.)
          </p>
        </div>

        <NuxtLink
          to="/artworks"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Continuer à explorer
        </NuxtLink>
      </header>

      <section
        v-if="cart.isEmpty"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
      >
        Votre panier est vide.
      </section>

      <section v-else class="grid gap-6">
        <div class="grid gap-3">
          <article
            v-for="item in cart.items"
            :key="item.artwork.id"
            class="grid gap-4 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 sm:grid-cols-[1fr_auto]"
          >
            <div class="min-w-0">
              <NuxtLink
                :to="`/artworks/${item.artwork.id}`"
                class="text-lg font-semibold text-white transition hover:text-[#C9D6FF]"
              >
                {{ item.artwork.title }}
              </NuxtLink>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                {{ item.artwork.artist?.displayName || "Artiste" }}
              </p>
              <p class="mt-2 text-sm text-[#A4B0C0]">
                Prix unitaire :
                {{ formatMarketplacePrice(item.artwork.priceValue ?? item.artwork.price) }}
              </p>
            </div>

            <div class="flex flex-col gap-3 sm:items-end">
              <label class="grid gap-2 text-sm text-[#9EABBE]">
                <span class="font-medium text-[#E6EDF7]">Quantité</span>
                <input
                  :value="item.quantity"
                  type="number"
                  min="1"
                  class="w-28 rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
                  @input="cart.setQuantity(item.artwork.id, $event.target.value)"
                />
              </label>

              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 text-sm font-semibold text-[#FBC8D0] transition hover:bg-[#2A1218]"
                @click="cart.removeArtwork(item.artwork.id)"
              >
                Retirer
              </button>
            </div>
          </article>
        </div>

        <div
          class="grid gap-4 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <p class="text-sm text-[#A0ADB4]">Total</p>
            <p class="mt-2 text-2xl font-semibold text-white">
              {{ formatMarketplacePrice(cart.totalPriceValue) }}
            </p>
            <p class="mt-1 text-sm text-[#A0ADB4]">
              {{ cart.count }} article{{ cart.count > 1 ? "s" : "" }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3 sm:justify-end">
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
              @click="cart.clear()"
            >
              Vider le panier
            </button>
            <NuxtLink
              to="/checkout"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
            >
              Checkout
            </NuxtLink>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { onMounted } from "vue";
import { useCartStore } from "~/stores/cart";
import { formatMarketplacePrice } from "~/utils/marketplace";

const cart = useCartStore();

onMounted(() => {
  cart.hydrate();
});
</script>
