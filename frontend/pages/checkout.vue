<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
      aria-labelledby="checkout-title"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Paiement sécurisé par Stripe
          </p>
          <h1
            id="checkout-title"
            class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white"
          >
            Finaliser l'achat
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Paiement simulé : la commande est enregistrée en base et les artistes concernés
            reçoivent une notification de vente.
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
        v-else-if="!order && cartSummary?.items?.length"
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Périmètre de lancement</p>
          <h2 class="mt-3 text-xl font-semibold text-white">Achat particulier en France</h2>
          <p class="mt-4 text-sm leading-6 text-[#A0ADB4]">
            Le lancement est réservé aux particuliers disposant d’une adresse de facturation
            française. Les achats professionnels seront ouverts dans une seconde phase.
          </p>
          <dl class="mt-6 grid gap-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-[#A0ADB4]">Prix</dt>
              <dd class="font-semibold text-white">TTC</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#A0ADB4]">Moyen accepté</dt>
              <dd class="font-semibold text-white">Carte bancaire</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#A0ADB4]">Marchand officiel</dt>
              <dd class="font-semibold text-white">Make It Art</dd>
            </div>
          </dl>
        </article>

        <form
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
          @submit.prevent="startCheckout"
        >
          <h2 class="text-xl font-semibold text-white">Adresse de facturation</h2>
          <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
            Cette adresse sera conservée dans le snapshot de la commande et utilisée pour votre
            facture.
          </p>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-sm text-[#A0ADB4] sm:col-span-2">
              <span class="font-medium text-white">Nom complet *</span>
              <input
                v-model.trim="billingDetails.name"
                required
                maxlength="120"
                autocomplete="name"
                class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-white"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4] sm:col-span-2">
              <span class="font-medium text-white">Adresse *</span>
              <input
                v-model.trim="billingDetails.addressLine1"
                required
                maxlength="160"
                autocomplete="address-line1"
                class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-white"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4] sm:col-span-2">
              <span class="font-medium text-white">Complément d’adresse</span>
              <input
                v-model.trim="billingDetails.addressLine2"
                maxlength="160"
                autocomplete="address-line2"
                class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-white"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-white">Code postal *</span>
              <input
                v-model.trim="billingDetails.postalCode"
                required
                inputmode="numeric"
                pattern="[0-9]{5}"
                maxlength="5"
                autocomplete="postal-code"
                class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-white"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-white">Ville *</span>
              <input
                v-model.trim="billingDetails.city"
                required
                maxlength="120"
                autocomplete="address-level2"
                class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-white"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4] sm:col-span-2">
              <span class="font-medium text-white">Pays</span>
              <input
                v-model="billingDetails.country"
                readonly
                autocomplete="country-name"
                class="rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-4 py-3 text-[#A0ADB4]"
              />
            </label>
          </div>

          <label class="mt-5 flex items-start gap-3 text-sm leading-6 text-[#A0ADB4]">
            <input
              v-model="billingDetails.consumerConfirmed"
              required
              type="checkbox"
              class="mt-1 h-4 w-4"
            />
            <span
              >Je confirme acheter en tant que particulier et non pour le compte d’une
              entreprise.</span
            >
          </label>

          <div
            v-if="errorMessage"
            class="mt-5 rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 py-4 text-sm text-[#FBC8D0]"
            role="alert"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="checkoutStarted || !billingDetails.consumerConfirmed"
          >
            {{ checkoutStarted ? "Préparation du paiement…" : "Continuer vers le paiement" }}
          </button>
        </form>
      </section>

      <section v-else-if="order" class="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <h2 class="text-xl font-semibold text-white">Récapitulatif</h2>
          <p class="mt-2 break-all text-xs text-[#71809A]">Commande {{ order.id }}</p>
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
              Prix vérifié côté serveur
            </span>
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

          <p class="mt-4 text-sm leading-6 text-[#A0ADB4]">
            Saisissez votre carte dans le formulaire Stripe ci-dessous.
          </p>

          <p
            v-if="savedPaymentMethodsAvailable"
            class="mt-3 rounded-2xl border border-[#203357] bg-[#091121] px-5 py-4 text-sm leading-6 text-[#BFD0FF]"
          >
            Vous pouvez demander à Stripe d’enregistrer cette carte pour vos prochains achats. Elle
            ne sera jamais débitée automatiquement et vous confirmerez toujours chaque paiement.
          </p>
          <p v-else class="mt-3 text-xs leading-5 text-[#71809A]">
            L’enregistrement et la réutilisation des cartes ne sont pas disponibles pour cette
            tentative. Vous pouvez tout de même payer normalement avec une nouvelle carte.
          </p>

          <form class="mt-6 grid gap-5" @submit.prevent="confirmPayment">
            <div
              id="payment-element"
              ref="paymentElementContainer"
              aria-label="Coordonnées de paiement sécurisées"
            ></div>

            <p class="text-sm leading-6 text-[#A0ADB4]">
              Make It Art ne reçoit et ne stocke jamais votre numéro de carte ni votre cryptogramme.
              Le montant affiché est TTC.
            </p>

            <div
              v-if="errorMessage"
              class="rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 py-4 text-sm text-[#FBC8D0]"
              role="alert"
            >
              <p>{{ errorMessage }}</p>
              <NuxtLink
                v-if="paymentElementLoadFailed"
                to="/payment/return"
                class="mt-3 inline-flex font-semibold text-[#FFD7DE] underline"
              >
                Vérifier le statut de la commande
              </NuxtLink>
            </div>

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
            Le statut final de la commande est confirmé côté serveur. Ne fermez pas la page pendant
            une authentification bancaire.
          </div>
        </article>
      </section>

      <div
        v-else
        class="rounded-[24px] border border-[#6C1F2D] bg-[#1D0B10] p-6 text-[#FBC8D0]"
        role="alert"
      >
        <p>
          {{ errorMessage || "Le formulaire de paiement sécurisé n’a pas pu être préparé." }}
        </p>
        <NuxtLink to="/cart" class="mt-4 inline-flex font-semibold text-[#C9D6FF] underline">
          Vérifier mon panier
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup>
import { loadStripe } from "@stripe/stripe-js";
import { storeToRefs } from "pinia";
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useCartStore } from "~/stores/cart";
import { useAuthStore } from "~/stores/auth";
import {
  buildPaymentReturnUrl,
  canMountPaymentElement,
  CHECKOUT_ORDER_STORAGE_KEY,
  createSecureUuid,
  getCustomerSessionClientSecret,
  getOrCreateIdempotencyKey,
  getSafePaymentError,
  isPublishableStripeKey
} from "~/utils/checkout-security";
import { navigateTo, useRoute, useRuntimeConfig } from "#app";

definePageMeta({
  middleware: "auth"
});

const config = useRuntimeConfig();
const route = useRoute();
const cartStore = useCartStore();
const auth = useAuthStore();
const { cart: cartSummary } = storeToRefs(cartStore);
const { user } = storeToRefs(auth);
const initializing = ref(true);
const submitting = ref(false);
const paymentElementReady = ref(false);
const paymentElementLoadFailed = ref(false);
const paymentElementContainer = ref(null);
const errorMessage = ref("");
const order = ref(null);
const checkoutStarted = ref(false);
const savedPaymentMethodsAvailable = ref(false);
const billingDetails = reactive({
  customerType: "B2C",
  consumerConfirmed: false,
  name: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France"
});

let stripeClient = null;
let elements = null;
let paymentElement = null;
let clientSecret = "";
let customerSessionClientSecret = "";

onMounted(async () => {
  try {
    const publishableKey = config.public.stripePublishableKey;
    if (!isPublishableStripeKey(publishableKey)) {
      throw new Error("Le paiement sécurisé n’est pas encore configuré.");
    }

    const resumeOrderId = typeof route.query.order === "string" ? route.query.order : "";

    if (resumeOrderId) {
      checkoutStarted.value = true;
      const csrfResponse = await getCsrfToken();
      const checkoutResponse = await $fetch(
        "/api/v1/orders/" + encodeURIComponent(resumeOrderId) + "/resume",
        {
          method: "POST",
          credentials: "include",
          headers: { "x-csrf-token": csrfResponse.csrfToken },
          body: {}
        }
      );
      await mountPaymentForm(checkoutResponse, publishableKey);
    } else {
      await cartStore.fetchCart();
      if (!cartSummary.value?.items?.length || !cartSummary.value.payable) {
        throw new Error("Votre panier doit être vérifié avant le paiement.");
      }
    }
    // Optionally hydrate auth
    try {
      await auth.fetchCurrentUser();
      billingDetails.name = user.value?.name || "";
    } catch {
      // handled by middleware
    }
  } catch (error) {
    errorMessage.value = getSafePaymentError({
      message: error?.data?.message || error?.message,
      supportReference: error?.data?.supportReference
    });
  } finally {
    initializing.value = false;
  }
});

async function getCsrfToken() {
  return $fetch("/api/v1/security/csrf-token", {
    credentials: "include"
  });
}

async function startCheckout() {
  if (checkoutStarted.value) return;

  checkoutStarted.value = true;
  errorMessage.value = "";

  try {
    const publishableKey = config.public.stripePublishableKey;
    const csrfResponse = await getCsrfToken();
    const idempotencyKey = getOrCreateIdempotencyKey(window.sessionStorage, cartSummary.value, () =>
      createSecureUuid(window.crypto)
    );
    const checkoutResponse = await $fetch("/api/v1/orders/checkout", {
      method: "POST",
      credentials: "include",
      headers: {
        "idempotency-key": idempotencyKey,
        "x-csrf-token": csrfResponse.csrfToken
      },
      body: {
        cartVersion: cartSummary.value.version,
        pricingFingerprint: cartSummary.value.pricingFingerprint,
        billingDetails: { ...billingDetails }
      }
    });

    await mountPaymentForm(checkoutResponse, publishableKey);
  } catch (error) {
    checkoutStarted.value = false;
    errorMessage.value = getSafePaymentError({
      message: error?.data?.message || error?.message,
      supportReference: error?.data?.supportReference
    });
  }
}

async function mountPaymentForm(checkoutResponse, publishableKey) {
  order.value = checkoutResponse.order;
  const savedBilling = checkoutResponse.order.billingDetails;
  if (savedBilling?.address) {
    billingDetails.customerType = savedBilling.customerType || "B2C";
    billingDetails.consumerConfirmed = true;
    billingDetails.name = savedBilling.name || "";
    billingDetails.addressLine1 = savedBilling.address.line1 || "";
    billingDetails.addressLine2 = savedBilling.address.line2 || "";
    billingDetails.postalCode = savedBilling.address.postalCode || "";
    billingDetails.city = savedBilling.address.city || "";
    billingDetails.country = "France";
  }
  window.sessionStorage.setItem(CHECKOUT_ORDER_STORAGE_KEY, order.value.id);

  if (!canMountPaymentElement(checkoutResponse.payment)) {
    clientSecret = "";
    await navigateTo("/payment/return");
    return;
  }

  clientSecret = checkoutResponse.payment.clientSecret;
  customerSessionClientSecret = getCustomerSessionClientSecret(checkoutResponse.payment) || "";
  savedPaymentMethodsAvailable.value = Boolean(customerSessionClientSecret);
  stripeClient = await loadStripe(publishableKey);

  if (!stripeClient) {
    throw new Error("Le prestataire de paiement sécurisé n’a pas pu être chargé.");
  }

  elements = stripeClient.elements({
    clientSecret,
    ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#4A6CF7",
        colorBackground: "#03060D",
        colorText: "#E6EDF7",
        colorDanger: "#FBC8D0",
        borderRadius: "16px"
      }
    }
  });
  paymentElement = elements.create("payment", {
    layout: "accordion",
    wallets: {
      applePay: "never",
      googlePay: "never"
    },
    defaultValues: {
      billingDetails: {
        name: billingDetails.name || undefined,
        address: {
          line1: billingDetails.addressLine1 || undefined,
          line2: billingDetails.addressLine2 || undefined,
          postal_code: billingDetails.postalCode || undefined,
          city: billingDetails.city || undefined,
          country: "FR"
        }
      }
    }
  });
  paymentElement.on("ready", () => {
    paymentElementReady.value = true;
  });
  paymentElement.on("loaderror", () => {
    paymentElementReady.value = false;
    paymentElementLoadFailed.value = true;
    errorMessage.value =
      "Le formulaire sécurisé n’a pas pu être chargé. Ne soumettez pas un nouveau paiement avant d’avoir vérifié le statut de la commande.";
  });

  initializing.value = false;
  await nextTick();

  if (!paymentElementContainer.value) {
    throw new Error("Le conteneur du formulaire de paiement sécurisé est indisponible.");
  }

  paymentElement.mount(paymentElementContainer.value);
}

onBeforeUnmount(() => {
  paymentElement?.destroy();
  paymentElement = null;
  elements = null;
  stripeClient = null;
  clientSecret = "";
  customerSessionClientSecret = "";
  savedPaymentMethodsAvailable.value = false;
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
      nodeEnv: import.meta.env.PROD ? "production" : "development"
    });
    const { error } = await stripeClient.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            name: billingDetails.name || undefined,
            address: {
              line1: billingDetails.addressLine1 || undefined,
              line2: billingDetails.addressLine2 || undefined,
              postal_code: billingDetails.postalCode || undefined,
              city: billingDetails.city || undefined,
              country: "FR"
            }
          }
        }
      },
      redirect: "if_required"
    });

    if (error) {
      errorMessage.value = getSafePaymentError(error);
      return;
    }

    clientSecret = "";
    await navigateTo("/payment/return");
  } catch (error) {
    errorMessage.value = getSafePaymentError({
      message: error?.data?.message || error?.message,
      supportReference: error?.data?.supportReference
    });
  } finally {
    submitting.value = false;
  }
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format(amount / 100);
}
</script>
