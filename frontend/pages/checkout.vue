<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
      aria-labelledby="checkout-title"
    >
      <header
        class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Paiement sécurisé par Stripe
          </p>
          <h1
            id="checkout-title"
            class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white"
          >
            Finaliser la commande
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Vos coordonnées bancaires sont directement traitées par Stripe et
            ne transitent jamais par Make It Art.
          </p>
        </div>

        <NuxtLink
          to="/cart"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Retour au panier
        </NuxtLink>
      </header>

      <p
        v-if="initializing"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
        role="status"
      >
        Préparation du formulaire de paiement sécurisé…
      </p>

      <section
        v-else-if="order"
        class="grid gap-6 lg:grid-cols-[1fr_0.9fr]"
      >
        <article
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
        >
          <h2 class="text-xl font-semibold text-white">Récapitulatif</h2>
          <p class="mt-2 break-all text-xs text-[#71809A]">
            Commande {{ order.id }}
          </p>

          <div v-if="cartSummary?.items?.length" class="mt-5 grid gap-3">
            <div
              v-for="item in cartSummary.items"
              :key="item.artworkId"
              class="flex items-start justify-between gap-4 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-white">
                  {{ item.title }}
                </p>
                <p class="mt-1 text-sm text-[#A0ADB4]">
                  x{{ item.quantity }} · {{ item.artistName || "Artiste" }}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold text-[#DCE7FF]">
                {{ formatMoney(item.subtotalAmount, item.currency) }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex items-end justify-between gap-4">
            <div>
              <p class="text-sm text-[#A0ADB4]">Total confirmé</p>
              <p class="mt-2 text-2xl font-semibold text-white">
                {{ formatMoney(order.amount, order.currency) }}
              </p>
            </div>
            <span
              class="rounded-full border border-[#245C3C] bg-[#0A2115] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9DE2B4]"
            >
              Vérifié côté serveur
            </span>
          </div>
        </article>

        <article
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
        >
          <h2 class="text-xl font-semibold text-white">Paiement</h2>
          <p class="mt-4 text-sm leading-6 text-[#A0ADB4]">
            Choisissez votre moyen de paiement dans le formulaire Stripe
            ci-dessous.
          </p>

          <form class="mt-6 grid gap-5" @submit.prevent="confirmPayment">
            <div
              id="payment-element"
              aria-label="Coordonnées de paiement sécurisées"
            ></div>

            <p class="text-sm leading-6 text-[#A0ADB4]">
              Make It Art ne reçoit et ne stocke jamais votre numéro de carte
              ni votre cryptogramme.
            </p>

            <p
              v-if="errorMessage"
              class="rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 py-4 text-sm text-[#FBC8D0]"
              role="alert"
            >
              {{ errorMessage }}
            </p>

            <button
              type="submit"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="submitting || !paymentElementReady"
            >
              {{
                submitting
                  ? "Confirmation en cours…"
                  : "Payer " + formatMoney(order.amount, order.currency)
              }}
            </button>
          </form>

          <div
            class="mt-6 rounded-2xl border border-[#203357] bg-[#091121] px-5 py-4 text-sm text-[#BFD0FF]"
          >
            Le statut final de la commande est confirmé côté serveur. Ne
            fermez pas la page pendant une authentification bancaire.
          </div>
        </article>
      </section>

      <div
        v-else
        class="rounded-[24px] border border-[#6C1F2D] bg-[#1D0B10] p-6 text-[#FBC8D0]"
        role="alert"
      >
        <p>
          {{
            errorMessage ||
            "Le formulaire de paiement sécurisé n’a pas pu être préparé."
          }}
        </p>
        <NuxtLink
          to="/cart"
          class="mt-4 inline-flex font-semibold text-[#C9D6FF] underline"
        >
          Vérifier mon panier
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup>
import { loadStripe } from "@stripe/stripe-js";
import { storeToRefs } from "pinia";
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useCartStore } from "~/stores/cart";
import {
  buildPaymentReturnUrl,
  CHECKOUT_ORDER_STORAGE_KEY,
  createSecureUuid,
  getOrCreateIdempotencyKey,
  getSafePaymentError,
  isPublishableStripeKey,
} from "~/utils/checkout-security";

definePageMeta({
  middleware: "auth",
});

const config = useRuntimeConfig();
const cartStore = useCartStore();
const { cart: cartSummary } = storeToRefs(cartStore);
const initializing = ref(true);
const submitting = ref(false);
const paymentElementReady = ref(false);
const errorMessage = ref("");
const order = ref(null);

let stripeClient = null;
let elements = null;
let paymentElement = null;
let clientSecret = "";

onMounted(async () => {
  try {
    const publishableKey = config.public.stripePublishableKey;

    if (!isPublishableStripeKey(publishableKey)) {
      throw new Error("Le paiement sécurisé n’est pas encore configuré.");
    }

    await cartStore.fetchCart();

    if (!cartSummary.value?.items?.length || !cartSummary.value.payable) {
      throw new Error("Votre panier doit être vérifié avant le paiement.");
    }

    const csrfResponse = await $fetch("/api/v1/security/csrf-token", {
      credentials: "include",
    });
    const idempotencyKey = getOrCreateIdempotencyKey(
      window.sessionStorage,
      cartSummary.value,
      () => createSecureUuid(window.crypto),
    );
    const checkoutResponse = await $fetch("/api/v1/orders/checkout", {
      method: "POST",
      credentials: "include",
      headers: {
        "idempotency-key": idempotencyKey,
        "x-csrf-token": csrfResponse.csrfToken,
      },
      body: {
        cartVersion: cartSummary.value.version,
        pricingFingerprint: cartSummary.value.pricingFingerprint,
      },
    });

    order.value = checkoutResponse.order;
    clientSecret = checkoutResponse.payment.clientSecret;
    window.sessionStorage.setItem(
      CHECKOUT_ORDER_STORAGE_KEY,
      order.value.id,
    );

    await nextTick();
    stripeClient = await loadStripe(publishableKey);

    if (!stripeClient) {
      throw new Error(
        "Le prestataire de paiement sécurisé n’a pas pu être chargé.",
      );
    }

    elements = stripeClient.elements({
      clientSecret,
      appearance: {
        theme: "night",
        variables: {
          colorPrimary: "#4A6CF7",
          colorBackground: "#03060D",
          colorText: "#E6EDF7",
          colorDanger: "#FBC8D0",
          borderRadius: "16px",
        },
      },
    });
    paymentElement = elements.create("payment", {
      layout: "accordion",
      wallets: {
        applePay: "auto",
        googlePay: "auto",
      },
    });
    paymentElement.on("ready", () => {
      paymentElementReady.value = true;
    });
    paymentElement.on("loaderror", () => {
      errorMessage.value =
        "Le formulaire de paiement n’a pas pu être chargé. Veuillez réessayer.";
    });
    paymentElement.mount("#payment-element");
  } catch (error) {
    errorMessage.value = getSafePaymentError({
      message: error?.data?.message || error?.message,
    });
  } finally {
    initializing.value = false;
  }
});

onBeforeUnmount(() => {
  paymentElement?.destroy();
  paymentElement = null;
  elements = null;
  stripeClient = null;
  clientSecret = "";
});

async function confirmPayment() {
  if (submitting.value || !stripeClient || !elements || !clientSecret) {
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    const { error: submitError } = await elements.submit();

    if (submitError) {
      errorMessage.value = getSafePaymentError(submitError);
      return;
    }

    const returnUrl = buildPaymentReturnUrl({
      configuredBaseUrl: config.public.appBaseUrl,
      currentOrigin: window.location.origin,
      nodeEnv: import.meta.env.PROD ? "production" : "development",
    });
    const { error } = await stripeClient.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      errorMessage.value = getSafePaymentError(error);
      return;
    }

    clientSecret = "";
    await navigateTo("/payment/return");
  } catch (error) {
    errorMessage.value = getSafePaymentError(error);
  } finally {
    submitting.value = false;
  }
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amount / 100);
}
</script>
