<template>
  <main class="checkout-page">
    <div class="checkout-page__shell">
      <section class="checkout-page__heading">
        <div>
          <p class="checkout-page__eyebrow">Stripe-secured checkout</p>
          <h1 class="checkout-page__title">Finalize Your Order</h1>
          <p class="checkout-page__copy">
            Review your billing details, lock the cart server-side, then complete the payment in
            Stripe without leaving the Make It Art experience.
          </p>
        </div>

        <NuxtLink to="/cart" class="checkout-page__back">Return to basket</NuxtLink>
      </section>

      <p v-if="initializing" class="checkout-page__loading" role="status">
        Preparing the secure checkout flow...
      </p>

      <section v-else-if="!hasCartItems && !order" class="checkout-page__empty">
        <p class="checkout-page__empty-title">Your checkout session is empty</p>
        <p class="checkout-page__empty-copy">
          Return to your basket, validate the artworks you want to purchase, then continue to the
          secure payment step.
        </p>
        <NuxtLink to="/cart" class="checkout-page__empty-action">Go back to basket</NuxtLink>
        <p
          v-if="errorMessage"
          class="checkout-page__feedback checkout-page__feedback--error"
          role="alert"
        >
          {{ errorMessage }}
        </p>
      </section>

      <section v-else-if="showFatalError" class="checkout-page__empty">
        <p class="checkout-page__empty-title">Unable to prepare checkout</p>
        <p class="checkout-page__empty-copy">
          {{ errorMessage || "The secure payment session could not be prepared." }}
        </p>
        <NuxtLink to="/cart" class="checkout-page__empty-action">Review basket</NuxtLink>
      </section>

      <section v-else class="checkout-layout">
        <div class="checkout-layout__main">
          <p
            v-if="errorMessage && !showFatalError"
            class="checkout-page__feedback checkout-page__feedback--error"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <article v-if="!order" class="checkout-card">
            <div class="checkout-card__header">
              <div>
                <p class="checkout-card__eyebrow">Billing details</p>
                <h2 class="checkout-card__title">Address & buyer declaration</h2>
              </div>
              <span class="checkout-card__badge">Step 1</span>
            </div>

            <p class="checkout-card__copy">
              This information is stored in the order snapshot and used for invoicing, tax, and
              payment verification.
            </p>

            <form class="checkout-form" @submit.prevent="startCheckout">
              <div class="checkout-form__grid">
                <label class="checkout-form__field checkout-form__field--full">
                  <span>Full name *</span>
                  <input
                    v-model.trim="billingDetails.name"
                    required
                    maxlength="120"
                    autocomplete="name"
                  />
                </label>

                <label class="checkout-form__field checkout-form__field--full">
                  <span>Address line 1 *</span>
                  <input
                    v-model.trim="billingDetails.addressLine1"
                    required
                    maxlength="160"
                    autocomplete="address-line1"
                  />
                </label>

                <label class="checkout-form__field checkout-form__field--full">
                  <span>Address line 2</span>
                  <input
                    v-model.trim="billingDetails.addressLine2"
                    maxlength="160"
                    autocomplete="address-line2"
                  />
                </label>

                <label class="checkout-form__field">
                  <span>Postal code *</span>
                  <input
                    v-model.trim="billingDetails.postalCode"
                    required
                    inputmode="numeric"
                    pattern="[0-9]{5}"
                    maxlength="5"
                    autocomplete="postal-code"
                  />
                </label>

                <label class="checkout-form__field">
                  <span>City *</span>
                  <input
                    v-model.trim="billingDetails.city"
                    required
                    maxlength="120"
                    autocomplete="address-level2"
                  />
                </label>

                <label class="checkout-form__field checkout-form__field--full">
                  <span>Country</span>
                  <input
                    v-model="billingDetails.country"
                    readonly
                    autocomplete="country-name"
                    class="checkout-form__readonly"
                  />
                </label>
              </div>

              <label class="checkout-form__checkbox">
                <input v-model="billingDetails.consumerConfirmed" required type="checkbox" />
                <span>
                  I confirm that I am purchasing as a private individual and not on behalf of a
                  company.
                </span>
              </label>

              <button
                type="submit"
                class="checkout-card__cta"
                :disabled="checkoutStarted || !billingDetails.consumerConfirmed"
              >
                <span>{{ checkoutStarted ? "Preparing payment..." : "Continue to payment" }}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </article>

          <article v-if="!order" class="checkout-card checkout-card--policy">
            <div class="checkout-card__header">
              <div>
                <p class="checkout-card__eyebrow">Launch perimeter</p>
                <h2 class="checkout-card__title">France B2C card checkout</h2>
              </div>
            </div>

            <p class="checkout-card__copy">
              This launch is currently limited to private buyers with a French billing address. All
              order totals are VAT-inclusive and confirmed on the server before payment creation.
            </p>

            <dl class="checkout-policy">
              <div class="checkout-policy__row">
                <dt>Pricing</dt>
                <dd>VAT included</dd>
              </div>
              <div class="checkout-policy__row">
                <dt>Accepted method</dt>
                <dd>Card payment</dd>
              </div>
              <div class="checkout-policy__row">
                <dt>Merchant of record</dt>
                <dd>Make It Art</dd>
              </div>
            </dl>
          </article>

          <article v-if="order" class="checkout-card">
            <div class="checkout-card__header">
              <div>
                <p class="checkout-card__eyebrow">Order locked</p>
                <h2 class="checkout-card__title">Verified order snapshot</h2>
              </div>
              <span class="checkout-card__badge">Step 2</span>
            </div>

            <p class="checkout-card__copy">
              Your basket has been validated server-side. The payment below is tied to this exact
              pricing snapshot.
            </p>

            <div class="checkout-order">
              <div class="checkout-order__top">
                <div>
                  <p class="checkout-order__label">Order reference</p>
                  <p class="checkout-order__reference">{{ order.id }}</p>
                </div>
                <span class="checkout-order__status">Server-verified</span>
              </div>

              <div class="checkout-order__items">
                <div
                  v-for="item in checkoutItems"
                  :key="item.artworkId"
                  class="checkout-order__item"
                >
                  <div class="checkout-order__item-copy">
                    <p class="checkout-order__item-title">{{ item.title }}</p>
                    <p class="checkout-order__item-meta">
                      x{{ item.quantity }} · {{ item.artistName || "Unknown artist" }}
                    </p>
                  </div>
                  <p class="checkout-order__item-price">
                    {{ formatMoney(item.subtotalAmount, item.currency) }}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article v-if="order" class="checkout-card checkout-card--payment">
            <div class="checkout-card__header">
              <div>
                <p class="checkout-card__eyebrow">Payment</p>
                <h2 class="checkout-card__title">Stripe payment form</h2>
              </div>
              <span
                class="checkout-card__badge"
                :class="{ 'checkout-card__badge--live': paymentElementReady }"
              >
                {{ paymentElementReady ? "Ready" : "Loading" }}
              </span>
            </div>

            <p class="checkout-card__copy">
              Your card information is processed directly by Stripe. Make It Art never stores your
              card number or security code.
            </p>

            <p v-if="savedPaymentMethodsAvailable" class="checkout-payment__notice">
              Stripe can save this card for future purchases if you choose to do so during payment.
              It will never be charged automatically without a new confirmation from you.
            </p>
            <p v-else class="checkout-payment__hint">
              Saved payment methods are not available for this attempt, but you can still complete
              checkout normally with a new card.
            </p>

            <form class="checkout-payment" @submit.prevent="confirmPayment">
              <div class="checkout-payment__element-shell">
                <div
                  id="payment-element"
                  ref="paymentElementContainer"
                  class="checkout-payment__element"
                  aria-label="Secure payment details"
                />
              </div>

              <p class="checkout-payment__copy">
                The final order status is always confirmed server-side after Stripe authorization.
                Do not close the page during bank authentication.
              </p>

              <div v-if="paymentElementLoadFailed" class="checkout-payment__warning">
                <p>
                  The secure payment form could not be loaded completely. Do not retry payment until
                  you check the current order state.
                </p>
                <NuxtLink to="/payment/return" class="checkout-payment__warning-link">
                  Check order status
                </NuxtLink>
              </div>

              <button
                type="submit"
                class="checkout-card__cta"
                :disabled="submitting || !paymentElementReady"
              >
                <span>
                  {{
                    submitting
                      ? "Confirming payment..."
                      : `Pay ${formatMoney(summaryTotalAmount, summaryCurrency)}`
                  }}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </article>
        </div>

        <aside class="checkout-summary">
          <div class="checkout-summary__panel">
            <h2 class="checkout-summary__title">Checkout Summary</h2>

            <div class="checkout-summary__items">
              <div
                v-for="item in checkoutItems"
                :key="`summary-${item.artworkId}`"
                class="checkout-summary__item"
              >
                <div class="checkout-summary__thumb">
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.title"
                    class="checkout-summary__thumb-image"
                  />
                  <div v-else class="checkout-summary__thumb-fallback">
                    {{ artworkInitials(item.title) }}
                  </div>
                </div>

                <div class="checkout-summary__item-copy">
                  <p class="checkout-summary__item-title">{{ item.title }}</p>
                  <p class="checkout-summary__item-meta">
                    x{{ item.quantity }} · {{ item.artistName }}
                  </p>
                </div>

                <p class="checkout-summary__item-price">
                  {{ formatMoney(item.subtotalAmount, item.currency) }}
                </p>
              </div>
            </div>

            <div class="checkout-summary__rows">
              <div class="checkout-summary__row">
                <span>Subtotal ({{ summaryItemCount }} items)</span>
                <span>{{ formatMoney(summaryNetAmount, summaryCurrency) }}</span>
              </div>
              <div class="checkout-summary__row">
                <span>VAT included</span>
                <span>{{ formatMoney(summaryTaxAmount, summaryCurrency) }}</span>
              </div>
              <div class="checkout-summary__row">
                <span>Platform service fee</span>
                <span>{{ formatMoney(summaryCommissionAmount, summaryCurrency) }}</span>
              </div>
            </div>

            <div class="checkout-summary__total">
              <div class="checkout-summary__total-row">
                <span class="checkout-summary__total-label">Total</span>
                <span class="checkout-summary__total-value">
                  {{ formatMoney(summaryTotalAmount, summaryCurrency) }}
                </span>
              </div>
              <p class="checkout-summary__total-caption">
                Locked server-side before payment intent creation.
              </p>
            </div>

            <div class="checkout-summary__features">
              <article class="checkout-summary__feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 2 5 5v6c0 4.8 2.9 9.2 7 11 4.1-1.8 7-6.2 7-11V5l-7-3Zm0 5.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm0 12.2c-1.9-1-3.5-2.7-4.5-4.8.8-.7 2-1.1 4.5-1.1s3.7.4 4.5 1.1c-1 2.1-2.6 3.8-4.5 4.8Z"
                    fill="currentColor"
                  />
                </svg>
                <div>
                  <h3>Secure checkout</h3>
                  <p>Pricing, ownership rules, and cart state are verified before payment.</p>
                </div>
              </article>

              <article class="checkout-summary__feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm3 2.5h10v2H7V9Zm0 4h6v2H7v-2Z"
                    fill="currentColor"
                  />
                </svg>
                <div>
                  <h3>Stripe processed</h3>
                  <p>Card details stay in Stripe’s PCI-compliant payment element.</p>
                </div>
              </article>
            </div>
          </div>
        </aside>
      </section>
    </div>
  </main>
</template>

<script setup>
import { loadStripe } from "@stripe/stripe-js";
import { navigateTo, useRoute, useRuntimeConfig } from "#app";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useCartStore } from "~/stores/cart";
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

const checkoutItems = computed(() => cartSummary.value?.items || []);
const hasCartItems = computed(() => checkoutItems.value.length > 0);
const summaryCurrency = computed(
  () => order.value?.currency || cartSummary.value?.currency || "EUR"
);
const summaryItemCount = computed(() => cartSummary.value?.itemCount || 0);
const summaryNetAmount = computed(() => cartSummary.value?.netAmount || 0);
const summaryTaxAmount = computed(() => cartSummary.value?.taxAmount || 0);
const summaryCommissionAmount = computed(() => cartSummary.value?.commissionAmount || 0);
const summaryTotalAmount = computed(
  () => order.value?.amount || cartSummary.value?.totalAmount || 0
);
const showFatalError = computed(
  () => Boolean(errorMessage.value) && !initializing.value && !hasCartItems.value && !order.value
);

onMounted(async () => {
  try {
    const publishableKey = config.public.stripePublishableKey;
    if (!isPublishableStripeKey(publishableKey)) {
      throw new Error("Secure payment is not configured yet.");
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
        throw new Error("Your basket must be validated before payment.");
      }
    }

    try {
      await auth.fetchCurrentUser();
      billingDetails.name = user.value?.name || "";
    } catch {
      // Auth middleware already protects the route.
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
    throw new Error("The secure payment provider could not be loaded.");
  }

  elements = stripeClient.elements({
    clientSecret,
    ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#8b5cf6",
        colorBackground: "#09090c",
        colorText: "#E6EDF7",
        colorDanger: "#fecdd3",
        colorTextSecondary: "#98a2b3",
        borderRadius: "18px"
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
      "The secure payment form could not be fully loaded. Check the order status before retrying any payment.";
  });

  initializing.value = false;
  await nextTick();

  if (!paymentElementContainer.value) {
    throw new Error("The secure payment form container is unavailable.");
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(Number(amount || 0) / 100);
}

function artworkInitials(title) {
  return String(title || "Artwork")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("");
}
</script>

<style scoped>
.checkout-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top center, rgba(124, 58, 237, 0.12), transparent 24%),
    linear-gradient(180deg, #000000 0%, #030406 100%);
  color: #e6edf7;
}

.checkout-page__shell {
  margin: 0 auto;
  width: 100%;
  max-width: 1440px;
  padding: 108px 72px 132px;
}

.checkout-page__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.checkout-page__eyebrow {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #b49cff;
}

.checkout-page__title {
  margin: 14px 0 0;
  font-family: Geist, sans-serif;
  font-size: clamp(2.2rem, 3vw, 3.5rem);
  font-weight: 600;
  line-height: 0.98;
  text-transform: uppercase;
  color: #ffffff;
}

.checkout-page__copy {
  margin: 16px 0 0;
  max-width: 760px;
  font-family: Geist, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #a7aebb;
}

.checkout-page__back,
.checkout-page__empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(14, 15, 19, 0.96);
  padding: 0 22px;
  font-family: Geist, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #f2f5f9;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.checkout-page__back:hover,
.checkout-page__empty-action:hover {
  border-color: rgba(139, 92, 246, 0.8);
  color: #ffffff;
}

.checkout-page__loading,
.checkout-page__empty {
  margin-top: 28px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(14, 15, 18, 0.98), rgba(8, 9, 12, 0.98));
  padding: 36px;
}

.checkout-page__empty-title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 34px;
  font-weight: 600;
  color: #ffffff;
}

.checkout-page__empty-copy {
  margin: 14px 0 0;
  max-width: 660px;
  font-family: Geist, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: #a7aebb;
}

.checkout-page__empty-action {
  margin-top: 24px;
}

.checkout-layout {
  margin-top: 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 392px;
  gap: 28px;
  align-items: start;
}

.checkout-layout__main {
  display: grid;
  gap: 18px;
}

.checkout-page__feedback {
  border: 1px solid rgba(64, 94, 160, 0.45);
  background: rgba(15, 23, 42, 0.85);
  padding: 16px 18px;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #c8d3ea;
}

.checkout-page__feedback--error {
  border-color: rgba(180, 45, 74, 0.45);
  background: rgba(41, 14, 20, 0.88);
  color: #fecdd3;
}

.checkout-card,
.checkout-summary__panel {
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: linear-gradient(180deg, rgba(18, 18, 21, 0.98), rgba(14, 14, 17, 0.98));
  box-shadow: 0 30px 84px rgba(0, 0, 0, 0.2);
}

.checkout-card {
  padding: 28px;
}

.checkout-card__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
}

.checkout-card__eyebrow {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #ab92ff;
}

.checkout-card__title {
  margin: 10px 0 0;
  font-family: Geist, sans-serif;
  font-size: clamp(1.7rem, 2.2vw, 2.5rem);
  font-weight: 600;
  line-height: 1;
  color: #ffffff;
}

.checkout-card__copy {
  margin: 16px 0 0;
  font-family: Geist, sans-serif;
  font-size: 15px;
  line-height: 1.75;
  color: #a8afbb;
}

.checkout-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(139, 92, 246, 0.24);
  background: rgba(53, 27, 110, 0.2);
  font-family: Geist, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #ece7ff;
}

.checkout-card__badge--live {
  border-color: rgba(34, 197, 94, 0.28);
  background: rgba(13, 44, 24, 0.4);
  color: #b7f0c7;
}

.checkout-card__cta {
  width: 100%;
  min-height: 60px;
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  background: linear-gradient(90deg, #7c3aed 0%, #9333ea 100%);
  font-family: Geist, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.checkout-card__cta:hover:not(:disabled) {
  transform: translateY(-1px);
}

.checkout-card__cta:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.checkout-form {
  margin-top: 22px;
}

.checkout-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.checkout-form__field {
  display: grid;
  gap: 8px;
}

.checkout-form__field--full {
  grid-column: 1 / -1;
}

.checkout-form__field span {
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #f2f5f9;
}

.checkout-form__field input {
  min-height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 10, 14, 0.98);
  padding: 0 16px;
  font-family: Geist, sans-serif;
  font-size: 15px;
  color: #e6edf7;
  outline: none;
  transition: border-color 0.2s ease;
}

.checkout-form__field input:focus {
  border-color: rgba(139, 92, 246, 0.9);
}

.checkout-form__readonly {
  color: #9ca3af !important;
  background: rgba(24, 24, 28, 0.96) !important;
}

.checkout-form__checkbox {
  margin-top: 20px;
  display: flex;
  align-items: start;
  gap: 12px;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  color: #b5bcc8;
}

.checkout-form__checkbox input {
  margin-top: 3px;
  width: 16px;
  height: 16px;
  accent-color: #8b5cf6;
}

.checkout-policy {
  margin: 24px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 20px;
  display: grid;
  gap: 16px;
}

.checkout-policy__row,
.checkout-summary__row,
.checkout-summary__total-row,
.checkout-order__top,
.checkout-order__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.checkout-policy__row {
  font-family: Geist, sans-serif;
  font-size: 15px;
  color: #d8dce5;
}

.checkout-policy__row dt {
  color: #a8afbb;
}

.checkout-order {
  margin-top: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(10, 11, 15, 0.98);
  padding: 22px;
}

.checkout-order__label {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #9aa3b2;
}

.checkout-order__reference {
  margin: 8px 0 0;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  color: #ffffff;
  word-break: break-all;
}

.checkout-order__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(34, 197, 94, 0.28);
  background: rgba(13, 44, 24, 0.4);
  font-family: Geist, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #b7f0c7;
}

.checkout-order__items {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.checkout-order__item {
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.checkout-order__item-copy {
  min-width: 0;
}

.checkout-order__item-title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.checkout-order__item-meta {
  margin: 6px 0 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  color: #9ea6b4;
}

.checkout-order__item-price {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #edf1f7;
}

.checkout-payment {
  margin-top: 22px;
}

.checkout-payment__notice,
.checkout-payment__warning {
  margin-top: 16px;
  border: 1px solid rgba(64, 94, 160, 0.4);
  background: rgba(15, 23, 42, 0.78);
  padding: 16px;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.65;
  color: #c8d3ea;
}

.checkout-payment__hint,
.checkout-payment__copy {
  margin: 16px 0 0;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  color: #a8afbb;
}

.checkout-payment__element-shell {
  margin-top: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 9, 12, 0.98);
  padding: 18px;
}

.checkout-payment__element {
  min-height: 300px;
}

.checkout-payment__warning {
  border-color: rgba(180, 45, 74, 0.45);
  background: rgba(41, 14, 20, 0.88);
  color: #fecdd3;
}

.checkout-payment__warning p {
  margin: 0;
}

.checkout-payment__warning-link {
  display: inline-flex;
  margin-top: 12px;
  font-weight: 600;
  color: #ffe7ec;
}

.checkout-summary {
  position: sticky;
  top: 110px;
}

.checkout-summary__panel {
  padding: 34px 30px 28px;
}

.checkout-summary__title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: clamp(1.8rem, 2.2vw, 2.5rem);
  font-weight: 600;
  text-transform: uppercase;
  color: #ffffff;
}

.checkout-summary__items {
  margin-top: 22px;
  display: grid;
  gap: 14px;
}

.checkout-summary__item {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.checkout-summary__thumb {
  width: 62px;
  aspect-ratio: 1;
  overflow: hidden;
  background: #101218;
}

.checkout-summary__thumb-image,
.checkout-summary__thumb-fallback {
  width: 100%;
  height: 100%;
}

.checkout-summary__thumb-image {
  object-fit: cover;
}

.checkout-summary__thumb-fallback {
  display: grid;
  place-items: center;
  font-family: Geist, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
  background:
    radial-gradient(circle at 30% 20%, rgba(124, 58, 237, 0.24), transparent 40%),
    linear-gradient(180deg, #1a1d27, #0d1016);
}

.checkout-summary__item-copy {
  min-width: 0;
}

.checkout-summary__item-title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.checkout-summary__item-meta {
  margin: 5px 0 0;
  font-family: Geist, sans-serif;
  font-size: 12px;
  color: #9ea6b4;
}

.checkout-summary__item-price {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #edf1f7;
}

.checkout-summary__rows {
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 22px 0;
  display: grid;
  gap: 16px;
}

.checkout-summary__row {
  font-family: Geist, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: #edf1f7;
}

.checkout-summary__row span:first-child {
  color: #cfd5de;
}

.checkout-summary__total {
  padding-top: 26px;
}

.checkout-summary__total-label {
  font-family: Geist, sans-serif;
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9ca3af;
}

.checkout-summary__total-value {
  font-family: Geist, sans-serif;
  font-size: clamp(2.15rem, 3vw, 3.25rem);
  font-weight: 600;
  line-height: 1;
  color: #ffffff;
}

.checkout-summary__total-caption {
  margin: 10px 0 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  text-align: right;
  color: #b3bac6;
}

.checkout-summary__features {
  margin-top: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.checkout-summary__feature {
  display: grid;
  gap: 12px;
}

.checkout-summary__feature svg {
  width: 22px;
  height: 22px;
  color: #e6edf7;
}

.checkout-summary__feature h3 {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
}

.checkout-summary__feature p {
  margin: 8px 0 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #c2c7d1;
}

@media (max-width: 1239px) {
  .checkout-page__shell {
    padding-inline: 42px;
  }

  .checkout-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

@media (max-width: 1023px) {
  .checkout-page__shell {
    padding-inline: 26px;
  }

  .checkout-page__heading {
    align-items: start;
    flex-direction: column;
  }

  .checkout-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .checkout-summary {
    position: static;
  }
}

@media (max-width: 767px) {
  .checkout-page__shell {
    padding: 64px 18px 94px;
  }

  .checkout-form__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .checkout-card__header,
  .checkout-order__top,
  .checkout-order__item,
  .checkout-policy__row,
  .checkout-summary__row,
  .checkout-summary__total-row {
    flex-direction: column;
    align-items: start;
  }

  .checkout-summary__item {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .checkout-summary__item-price {
    grid-column: 2;
  }

  .checkout-summary__features {
    grid-template-columns: minmax(0, 1fr);
  }

  .checkout-summary__total-caption {
    text-align: left;
  }
}
</style>
