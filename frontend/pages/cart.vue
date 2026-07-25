<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
      aria-labelledby="cart-title"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Panier sécurisé</p>
          <h1
            id="cart-title"
            class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white"
          >
            Récapitulatif
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Les prix et la disponibilité sont vérifiés côté serveur avant le paiement.
          </p>
        </div>

        <NuxtLink
          to="/artworks"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Continuer à explorer
        </NuxtLink>
      </header>

      <p
        v-if="loading && !cartSummary"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
        role="status"
      >
        Chargement de votre panier…
      </p>

      <section
        v-else-if="!cartSummary || cartSummary.items.length === 0"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
      >
        <p>Votre panier est vide.</p>
        <p v-if="error" class="mt-3 text-[#FBC8D0]" role="alert">
          {{ error }}
        </p>
      </section>

      <section v-else class="grid gap-6">
        <div class="grid gap-3">
          <article
            v-for="item in cartSummary.items"
            :key="item.artworkId"
            class="grid gap-4 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 sm:grid-cols-[1fr_auto]"
          >
            <div class="min-w-0">
              <NuxtLink
                :to="'/artworks/' + item.artworkId"
                class="text-lg font-semibold text-white transition hover:text-[#C9D6FF]"
              >
                {{ item.title }}
              </NuxtLink>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                {{ item.artistName || "Artiste" }}
              </p>
              <p class="mt-2 text-sm text-[#A4B0C0]">
                Prix unitaire :
                {{ formatMoney(item.unitAmount, item.currency) }}
              </p>
              <p v-if="item.issue" class="mt-3 text-sm text-[#FBC8D0]" role="alert">
                {{ issueMessage(item.issue) }}
              </p>
            </div>

            <div class="flex flex-col gap-3 sm:items-end">
              <p class="text-sm font-semibold text-[#DCE7FF]">
                {{ formatMoney(item.subtotalAmount, item.currency) }}
              </p>
              <label class="grid gap-2 text-sm text-[#9EABBE]">
                <span class="font-medium text-[#E6EDF7]">Quantité</span>
                <input
                  :value="item.quantity"
                  type="number"
                  min="1"
                  :max="Math.max(1, Math.min(item.availableQuantity, 100))"
                  :disabled="loading"
                  class="w-28 rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] disabled:cursor-not-allowed disabled:opacity-60"
                  @change="updateQuantity(item, $event)"
                />
              </label>

              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 text-sm font-semibold text-[#FBC8D0] transition hover:bg-[#2A1218] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="loading"
                :aria-label="'Retirer ' + item.title + ' du panier'"
                @click="removeItem(item.artworkId)"
              >
                Retirer
              </button>
            </div>
          </article>
        </div>

        <p
          v-if="error"
          class="rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 py-4 text-sm text-[#FBC8D0]"
          role="alert"
        >
          {{ error }}
        </p>
        <p
          v-if="validationMessage"
          class="rounded-2xl border border-[#245C3C] bg-[#0A2115] px-5 py-4 text-sm text-[#9DE2B4]"
          role="status"
        >
          {{ validationMessage }}
        </p>

        <div
          class="grid gap-4 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <p class="text-sm text-[#A0ADB4]">Total</p>
            <p class="mt-2 text-2xl font-semibold text-white">
              {{ formatMoney(cartSummary.totalAmount, cartSummary.currency) }}
            </p>
            <p class="mt-1 text-sm text-[#A0ADB4]">
              {{ cartSummary.itemCount }} article{{ cartSummary.itemCount > 1 ? "s" : "" }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3 sm:justify-end">
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading"
              @click="clearCart"
            >
              Vider le panier
            </button>
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || !cartSummary.payable"
              @click="validateCart"
            >
              {{ loading ? "Vérification…" : "Vérifier et payer" }}
            </button>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useCartStore } from "~/stores/cart";

definePageMeta({
  middleware: "auth"
});

const cartStore = useCartStore();
const { cart: cartSummary, loading, error, validationMessage } = storeToRefs(cartStore);

onMounted(async () => {
  try {
    await cartStore.fetchCart();
  } catch {
    // Le store fournit un message sans détail technique à afficher.
  }
});

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format(amount / 100);
}

function issueMessage(issue) {
  const messages = {
    ARTWORK_NOT_AVAILABLE: "Cette œuvre n’est plus disponible.",
    ARTWORK_PRICE_UNAVAILABLE: "Le prix actuel ne peut pas être confirmé.",
    INSUFFICIENT_STOCK: "La quantité demandée n’est plus disponible."
  };

  return messages[issue] || "Cet article doit être vérifié.";
}

async function updateQuantity(item, event) {
  const quantity = Number(event.target.value);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    event.target.value = item.quantity;
    return;
  }

  try {
    await cartStore.setItem(item.artworkId, quantity);
  } catch {
    event.target.value = item.quantity;
  }
}

async function removeItem(artworkId) {
  try {
    await cartStore.removeItem(artworkId);
  } catch {
    // Le store fournit un message sans détail technique à afficher.
  }
}

async function clearCart() {
  try {
    await cartStore.clearCart();
  } catch {
    // Le store fournit un message sans détail technique à afficher.
  }
}

async function validateCart() {
  const valid = await cartStore.validateForCheckout();

  if (valid) {
    await navigateTo("/checkout");
  }
}
</script>
