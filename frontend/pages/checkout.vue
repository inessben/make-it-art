<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Checkout
          </p>
          <h1 class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white">
            Finaliser l'achat
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Paiement simule : la commande est enregistree en base et les artistes
            concernes recoivent une notification de vente.
          </p>
        </div>

        <NuxtLink
          to="/cart"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Retour au panier
        </NuxtLink>
      </header>

      <section v-if="cart.isEmpty" class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]">
        Votre panier est vide. Revenez au catalogue pour ajouter des oeuvres.
      </section>

      <section v-else class="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <h2 class="text-xl font-semibold text-white">Recapitulatif</h2>
          <div class="mt-5 grid gap-3">
            <div
              v-for="item in cart.items"
              :key="item.artwork.id"
              class="flex items-start justify-between gap-4 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-white">{{ item.artwork.title }}</p>
                <p class="mt-1 text-sm text-[#A0ADB4]">
                  x{{ item.quantity }} · {{ item.artwork.artist?.displayName || "Artiste" }}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold text-[#DCE7FF]">
                {{ formatMarketplacePrice((item.artwork.priceValue ?? 0) * item.quantity) }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex items-end justify-between gap-4">
            <div>
              <p class="text-sm text-[#A0ADB4]">Total</p>
              <p class="mt-2 text-2xl font-semibold text-white">
                {{ formatMarketplacePrice(cart.totalPriceValue) }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
              @click="cart.clear()"
            >
              Vider le panier
            </button>
          </div>
        </article>

        <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <h2 class="text-xl font-semibold text-white">Paiement</h2>

          <div
            v-if="successMessage"
            class="mt-4 rounded-2xl border border-[#12301F] bg-[#081912] px-5 py-4 text-sm text-[#86EFAC]"
          >
            {{ successMessage }}
          </div>

          <div
            v-if="errorMessage"
            class="mt-4 rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
          >
            {{ errorMessage }}
          </div>

          <div class="mt-6 grid gap-4">
            <label class="grid gap-2 text-sm text-[#9EABBE]">
              <span class="font-medium text-[#E6EDF7]">Email de facturation</span>
              <input
                v-model.trim="billingEmail"
                type="email"
                placeholder="you@example.com"
                class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
              />
            </label>

            <label class="grid gap-2 text-sm text-[#9EABBE]">
              <span class="font-medium text-[#E6EDF7]">Mode de paiement</span>
              <select
                v-model="paymentMethod"
                class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
              >
                <option value="card">Carte bancaire (simulation)</option>
                <option value="crypto">Crypto (simulation)</option>
              </select>
            </label>

            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="submitting"
              @click="submitCheckout"
            >
              {{ submitting ? "Traitement..." : "Confirmer le paiement" }}
            </button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";
import { useAuthStore } from "~/stores/auth";
import { formatMarketplacePrice } from "~/utils/marketplace";

definePageMeta({
  middleware: "auth",
});

const cart = useCartStore();
const auth = useAuthStore();
const { user } = storeToRefs(auth);

const billingEmail = ref("");
const paymentMethod = ref("card");
const submitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(async () => {
  cart.hydrate();

  try {
    await auth.fetchCurrentUser();
    billingEmail.value = user.value?.email || "";
  } catch {
    // handled by middleware
  }
});

async function submitCheckout() {
  if (cart.isEmpty || submitting.value) {
    return;
  }

  submitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/orders/checkout", {
      method: "POST",
      credentials: "include",
      body: {
        billingEmail: billingEmail.value,
        paymentMethod: paymentMethod.value,
        items: cart.items.map((item) => ({
          artworkId: item.artwork.id,
          quantity: item.quantity,
        })),
      },
    });

    cart.clear();
    successMessage.value = `Commande ${response.order.reference} confirmee.`;

    setTimeout(async () => {
      await navigateTo("/profile");
    }, 1200);
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    errorMessage.value =
      error?.data?.message || "Impossible de finaliser la commande.";
  } finally {
    submitting.value = false;
  }
}
</script>
