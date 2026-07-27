<template>
  <main class="cart-page">
    <div class="cart-page__shell">
      <section class="cart-page__heading">
        <div>
          <h1 class="cart-page__title">
            Shopping Basket
            <span class="cart-page__title-count">({{ cartItems.length }})</span>
          </h1>
        </div>

        <button
          type="button"
          class="cart-page__clear"
          :disabled="loading || !cartItems.length"
          @click="clearCart"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 4h6l1 2h4v2H4V6h4l1-2Zm1 6h2v7h-2v-7Zm4 0h2v7h-2v-7ZM7 10h2v7H7v-7Z"
              fill="currentColor"
            />
          </svg>
          <span>clear all</span>
        </button>
      </section>

      <p v-if="loading && !cartSummary" class="cart-page__loading" role="status">
        Loading your basket...
      </p>

      <section v-else-if="!cartSummary || cartItems.length === 0" class="cart-page__empty">
        <p class="cart-page__empty-title">Your basket is empty</p>
        <p class="cart-page__empty-copy">
          Add a few artworks to review them here before continuing to checkout.
        </p>
        <NuxtLink to="/artworks" class="cart-page__empty-action">Browse artworks</NuxtLink>
        <p
          v-if="currentErrorMessage"
          class="cart-page__feedback cart-page__feedback--error"
          role="alert"
        >
          {{ currentErrorMessage }}
        </p>
      </section>

      <section v-else class="cart-layout">
        <div class="cart-layout__items">
          <p
            v-if="currentErrorMessage"
            class="cart-page__feedback cart-page__feedback--error"
            role="alert"
          >
            {{ currentErrorMessage }}
          </p>
          <p
            v-else-if="pageMessage"
            class="cart-page__feedback"
            :class="
              pageMessageTone === 'success'
                ? 'cart-page__feedback--success'
                : 'cart-page__feedback--info'
            "
            role="status"
          >
            {{ pageMessage }}
          </p>
          <p
            v-else-if="validationMessage"
            class="cart-page__feedback cart-page__feedback--success"
            role="status"
          >
            {{ validationMessage }}
          </p>

          <article v-for="item in cartItems" :key="item.artworkId" class="cart-item">
            <NuxtLink :to="`/artworks/${item.artworkId}`" class="cart-item__media">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.title"
                class="cart-item__image"
              />
              <div v-else class="cart-item__fallback">
                {{ artworkInitials(item.title) }}
              </div>
            </NuxtLink>

            <div class="cart-item__content">
              <div class="cart-item__main">
                <div class="cart-item__copy">
                  <NuxtLink :to="`/artworks/${item.artworkId}`" class="cart-item__title">
                    {{ item.title }}
                  </NuxtLink>
                  <p class="cart-item__artist">By {{ item.artistName || "Unknown artist" }}</p>
                  <p v-if="item.issue" class="cart-item__issue" role="alert">
                    {{ issueMessage(item.issue) }}
                  </p>
                </div>

                <div class="cart-item__price-block">
                  <span class="cart-item__price-label">Price</span>
                  <span class="cart-item__price-value">
                    {{ formatMoney(item.subtotalAmount, item.currency) }}
                  </span>
                </div>
              </div>

              <div class="cart-item__footer">
                <div class="cart-item__actions">
                  <button
                    type="button"
                    class="cart-item__action"
                    :disabled="loading"
                    @click="removeItem(item.artworkId)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M9 4h6l1 2h4v2H4V6h4l1-2Zm1 6h2v7h-2v-7Zm4 0h2v7h-2v-7ZM7 10h2v7H7v-7Z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Remove</span>
                  </button>

                  <button
                    type="button"
                    class="cart-item__action"
                    :disabled="Boolean(wishlistLoading[item.artworkId])"
                    @click="saveForLater(item)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 20.4 4.9 13.8C3 12.1 2 10.5 2 8.6 2 5.8 4.2 4 6.8 4c1.5 0 3 .7 4 1.9C11.9 4.7 13.4 4 14.9 4 17.6 4 20 5.8 20 8.6c0 1.9-1 3.5-2.9 5.2L12 20.4Z"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.7"
                      />
                    </svg>
                    <span>
                      {{
                        savedArtworkIds[item.artworkId]
                          ? "Saved to wishlist"
                          : wishlistLoading[item.artworkId]
                            ? "Saving..."
                            : "Save for later"
                      }}
                    </span>
                  </button>
                </div>

                <div class="cart-item__meta">
                  <div class="cart-item__quantity">
                    <span class="cart-item__quantity-label">Qty</span>
                    <div class="cart-item__stepper">
                      <button
                        type="button"
                        class="cart-item__stepper-button"
                        :disabled="loading || item.quantity <= 1"
                        :aria-label="`Decrease quantity for ${item.title}`"
                        @click="changeQuantity(item, item.quantity - 1)"
                      >
                        -
                      </button>
                      <span class="cart-item__stepper-value">{{ item.quantity }}</span>
                      <button
                        type="button"
                        class="cart-item__stepper-button"
                        :disabled="loading || item.quantity >= quantityLimit(item)"
                        :aria-label="`Increase quantity for ${item.title}`"
                        @click="changeQuantity(item, item.quantity + 1)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span class="cart-item__edition">
                    {{ editionLabel(item) }}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside class="cart-summary">
          <div class="cart-summary__panel">
            <h2 class="cart-summary__title">Order Summary</h2>

            <div class="cart-summary__rows">
              <div class="cart-summary__row">
                <span>Subtotal ({{ cartSummary.itemCount }} items)</span>
                <span>{{ formatMoney(cartSummary.netAmount, cartSummary.currency) }}</span>
              </div>
              <div class="cart-summary__row">
                <span>VAT included</span>
                <span>{{ formatMoney(cartSummary.taxAmount, cartSummary.currency) }}</span>
              </div>
              <div class="cart-summary__row">
                <span>Platform service fee</span>
                <span>{{ formatMoney(cartSummary.commissionAmount, cartSummary.currency) }}</span>
              </div>
            </div>

            <div class="cart-summary__total">
              <div class="cart-summary__total-row">
                <span class="cart-summary__total-label">Total</span>
                <span class="cart-summary__total-value">
                  {{ formatMoney(cartSummary.totalAmount, cartSummary.currency) }}
                </span>
              </div>
              <p class="cart-summary__total-caption">
                Price and availability are validated server-side before payment.
              </p>
            </div>

            <button
              type="button"
              class="cart-summary__cta"
              :disabled="loading || !cartSummary.payable"
              @click="validateCart"
            >
              <span>{{ loading ? "Checking..." : "Proceed to checkout" }}</span>
              <span aria-hidden="true">→</span>
            </button>

            <p class="cart-summary__legal">
              By proceeding, you agree to the checkout verification flow and to our licensing terms.
            </p>

            <div class="cart-summary__features">
              <article class="cart-summary__feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 2 5 5v6c0 4.8 2.9 9.2 7 11 4.1-1.8 7-6.2 7-11V5l-7-3Zm0 5.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Zm0 12.2c-1.9-1-3.5-2.7-4.5-4.8.8-.7 2-1.1 4.5-1.1s3.7.4 4.5 1.1c-1 2.1-2.6 3.8-4.5 4.8Z"
                    fill="currentColor"
                  />
                </svg>
                <div>
                  <h3>Secure verification</h3>
                  <p>Artwork pricing and ownership rules are checked before Stripe payment.</p>
                </div>
              </article>

              <article class="cart-summary__feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm3 2.5h10v2H7V9Zm0 4h6v2H7v-2Z"
                    fill="currentColor"
                  />
                </svg>
                <div>
                  <h3>Stripe checkout</h3>
                  <p>Your card details stay inside Stripe’s secure payment form.</p>
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
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart";

definePageMeta({
  middleware: "auth"
});

const cartStore = useCartStore();
const { cart: cartSummary, loading, error, validationMessage } = storeToRefs(cartStore);
const savedArtworkIds = ref({});
const wishlistLoading = ref({});
const pageMessage = ref("");
const pageMessageTone = ref("info");

const cartItems = computed(() => cartSummary.value?.items || []);
const currentErrorMessage = computed(() => error.value || "");

onMounted(async () => {
  try {
    await cartStore.fetchCart();
  } catch {
    // Store message is displayed in the page.
  }
});

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(Number(amount || 0) / 100);
}

function issueMessage(issue) {
  const messages = {
    ARTWORK_NOT_AVAILABLE: "This artwork is no longer available for purchase.",
    ARTWORK_PRICE_UNAVAILABLE: "The latest price could not be confirmed.",
    INSUFFICIENT_STOCK: "The requested quantity is no longer available.",
    SELF_PURCHASE_NOT_ALLOWED: "You cannot purchase your own artwork."
  };

  return messages[issue] || "This artwork needs to be reviewed before checkout.";
}

function quantityLimit(item) {
  const limit = Number(item.availableQuantity);

  if (!Number.isFinite(limit) || limit <= 0) {
    return 100;
  }

  return Math.max(1, Math.min(limit, 100));
}

async function changeQuantity(item, nextQuantity) {
  const quantity = Math.max(1, Math.min(Number(nextQuantity || 1), quantityLimit(item)));

  if (quantity === item.quantity) {
    return;
  }

  pageMessage.value = "";

  try {
    await cartStore.setItem(item.artworkId, quantity);
  } catch {
    // Store message is displayed in the page.
  }
}

async function removeItem(artworkId) {
  pageMessage.value = "";

  try {
    await cartStore.removeItem(artworkId);
  } catch {
    // Store message is displayed in the page.
  }
}

async function clearCart() {
  pageMessage.value = "";

  try {
    await cartStore.clearCart();
    pageMessage.value = "Your basket has been cleared.";
    pageMessageTone.value = "success";
  } catch {
    // Store message is displayed in the page.
  }
}

function setWishlistLoading(artworkId, value) {
  wishlistLoading.value = {
    ...wishlistLoading.value,
    [artworkId]: value
  };
}

async function saveForLater(item) {
  pageMessage.value = "";

  if (savedArtworkIds.value[item.artworkId]) {
    await navigateTo("/wishlist");
    return;
  }

  setWishlistLoading(item.artworkId, true);

  try {
    await $fetch(`/api/artworks/${item.artworkId}/favorite`, {
      method: "POST",
      credentials: "include"
    });

    savedArtworkIds.value = {
      ...savedArtworkIds.value,
      [item.artworkId]: true
    };
    pageMessage.value = `"${item.title}" has been saved to your wishlist.`;
    pageMessageTone.value = "success";
  } catch (fetchError) {
    pageMessage.value =
      fetchError?.data?.message || "Unable to save this artwork to your wishlist.";
    pageMessageTone.value = "info";
  } finally {
    setWishlistLoading(item.artworkId, false);
  }
}

async function validateCart() {
  pageMessage.value = "";
  const valid = await cartStore.validateForCheckout();

  if (valid) {
    await navigateTo("/checkout");
  }
}

function editionLabel(item) {
  if (item.isUnlimited) {
    return "OPEN EDITION";
  }

  if (String(item.licenseType || "").toUpperCase() === "EXCLUSIVE") {
    return "EDITION 1/1";
  }

  if (Number(item.availableQuantity) > 1) {
    return `LIMITED ${Math.min(item.quantity, item.availableQuantity)}/${item.availableQuantity}`;
  }

  return "EDITION 1/1";
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
.cart-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top center, rgba(124, 58, 237, 0.12), transparent 24%),
    linear-gradient(180deg, #000000 0%, #030406 100%);
  color: #e6edf7;
}

.cart-page__shell {
  margin: 0 auto;
  width: 100%;
  max-width: 1440px;
  padding: 108px 72px 132px;
}

.cart-page__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.cart-page__title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: clamp(2.1rem, 3vw, 3.4rem);
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  color: #ffffff;
}

.cart-page__title-count {
  color: #d9dce4;
}

.cart-page__clear {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 8px 0;
  font-family: Geist, sans-serif;
  font-size: 16px;
  color: #f0f3f8;
  text-transform: lowercase;
  transition: color 0.2s ease;
}

.cart-page__clear svg {
  width: 17px;
  height: 17px;
}

.cart-page__clear:hover:not(:disabled) {
  color: #8b5cf6;
}

.cart-page__clear:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.cart-layout {
  margin-top: 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 392px;
  gap: 28px;
  align-items: start;
}

.cart-layout__items {
  display: grid;
  gap: 18px;
}

.cart-page__loading,
.cart-page__empty {
  margin-top: 28px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(180deg, rgba(14, 15, 18, 0.98), rgba(8, 9, 12, 0.98));
  padding: 36px;
}

.cart-page__empty-title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 34px;
  font-weight: 600;
  color: #ffffff;
}

.cart-page__empty-copy {
  margin: 14px 0 0;
  max-width: 620px;
  font-family: Geist, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: #a7aebb;
}

.cart-page__empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  margin-top: 24px;
  border: 1px solid rgba(139, 92, 246, 0.8);
  background: linear-gradient(90deg, #7c3aed 0%, #9333ea 100%);
  padding: 0 24px;
  font-family: Geist, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  text-decoration: none;
}

.cart-page__feedback {
  border: 1px solid rgba(64, 94, 160, 0.45);
  background: rgba(15, 23, 42, 0.85);
  padding: 16px 18px;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.6;
}

.cart-page__feedback--error {
  border-color: rgba(180, 45, 74, 0.45);
  background: rgba(41, 14, 20, 0.88);
  color: #fecdd3;
}

.cart-page__feedback--success {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(8, 31, 18, 0.88);
  color: #b8f5c9;
}

.cart-page__feedback--info {
  color: #c8d3ea;
}

.cart-item {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 22px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(13, 13, 16, 0.98), rgba(8, 8, 11, 0.98));
  padding: 22px;
}

.cart-item__media {
  display: block;
  aspect-ratio: 1;
  width: 128px;
  overflow: hidden;
  background: #101218;
  text-decoration: none;
}

.cart-item__image,
.cart-item__fallback {
  width: 100%;
  height: 100%;
}

.cart-item__image {
  object-fit: cover;
}

.cart-item__fallback {
  display: grid;
  place-items: center;
  font-family: Geist, sans-serif;
  font-size: 34px;
  font-weight: 700;
  color: #f1f5f9;
  background:
    radial-gradient(circle at 30% 20%, rgba(124, 58, 237, 0.24), transparent 40%),
    linear-gradient(180deg, #1a1d27, #0d1016);
}

.cart-item__content {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.cart-item__main {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 28px;
}

.cart-item__copy {
  min-width: 0;
}

.cart-item__title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: clamp(1.6rem, 2vw, 2.35rem);
  font-weight: 500;
  line-height: 1.02;
  text-transform: uppercase;
  color: #f5f7fb;
  text-decoration: none;
}

.cart-item__artist {
  margin: 10px 0 0;
  font-family: Geist, sans-serif;
  font-size: 16px;
  color: #d1d6df;
}

.cart-item__issue {
  margin: 14px 0 0;
  font-family: Geist, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #ffb9c5;
}

.cart-item__price-block {
  min-width: 132px;
  display: grid;
  justify-items: end;
  gap: 8px;
}

.cart-item__price-label {
  font-family: Geist, sans-serif;
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c1c7d2;
}

.cart-item__price-value {
  font-family: Geist, sans-serif;
  font-size: clamp(1.8rem, 2vw, 2.55rem);
  font-weight: 600;
  line-height: 1;
  color: #ffffff;
}

.cart-item__footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}

.cart-item__actions {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}

.cart-item__action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  font-family: Geist, sans-serif;
  font-size: 16px;
  color: #edf1f7;
  text-transform: uppercase;
  transition: color 0.2s ease;
}

.cart-item__action svg {
  width: 17px;
  height: 17px;
}

.cart-item__action:hover:not(:disabled) {
  color: #8b5cf6;
}

.cart-item__action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.cart-item__meta {
  display: flex;
  align-items: end;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cart-item__quantity {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.cart-item__quantity-label {
  font-family: Geist, sans-serif;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9ca3af;
}

.cart-item__stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(20, 20, 24, 0.96);
}

.cart-item__stepper-button,
.cart-item__stepper-value {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Geist, sans-serif;
  font-size: 16px;
}

.cart-item__stepper-button {
  border: 0;
  background: transparent;
  color: #edf1f7;
}

.cart-item__stepper-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.cart-item__stepper-value {
  border-inline: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.cart-item__edition {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 16px;
  background: rgba(28, 28, 32, 0.95);
  font-family: Geist, sans-serif;
  font-size: 15px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e5e7eb;
}

.cart-summary {
  position: sticky;
  top: 110px;
}

.cart-summary__panel {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: linear-gradient(180deg, rgba(18, 18, 21, 0.98), rgba(14, 14, 17, 0.98));
  padding: 34px 30px 28px;
  box-shadow: 0 34px 84px rgba(0, 0, 0, 0.24);
}

.cart-summary__title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: clamp(1.8rem, 2.2vw, 2.5rem);
  font-weight: 600;
  text-transform: uppercase;
  color: #ffffff;
}

.cart-summary__rows {
  margin-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  padding: 22px 0;
  display: grid;
  gap: 18px;
}

.cart-summary__row,
.cart-summary__total-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
}

.cart-summary__row {
  font-family: Geist, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #f0f3f8;
}

.cart-summary__row span:first-child {
  color: #d6d8dd;
}

.cart-summary__total {
  padding-top: 28px;
}

.cart-summary__total-label {
  font-family: Geist, sans-serif;
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9ca3af;
}

.cart-summary__total-value {
  font-family: Geist, sans-serif;
  font-size: clamp(2.25rem, 3vw, 3.35rem);
  font-weight: 600;
  line-height: 1;
  color: #ffffff;
}

.cart-summary__total-caption {
  margin: 10px 0 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #b3bac6;
  text-align: right;
}

.cart-summary__cta {
  width: 100%;
  min-height: 62px;
  margin-top: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  background: linear-gradient(90deg, #7c3aed 0%, #9333ea 100%);
  font-family: Geist, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.cart-summary__cta:hover:not(:disabled) {
  transform: translateY(-1px);
}

.cart-summary__cta:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.cart-summary__legal {
  margin: 22px 8px 0;
  font-family: Geist, sans-serif;
  font-size: 12px;
  line-height: 1.8;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: #aeb4bf;
}

.cart-summary__features {
  margin-top: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.cart-summary__feature {
  display: grid;
  gap: 12px;
}

.cart-summary__feature svg {
  width: 22px;
  height: 22px;
  color: #e6edf7;
}

.cart-summary__feature h3 {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
}

.cart-summary__feature p {
  margin: 8px 0 0;
  font-family: Geist, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #c2c7d1;
}

@media (max-width: 1239px) {
  .cart-page__shell {
    padding-inline: 42px;
  }

  .cart-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

@media (max-width: 1023px) {
  .cart-page__shell {
    padding-inline: 26px;
  }

  .cart-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 767px) {
  .cart-page__shell {
    padding: 64px 18px 94px;
  }

  .cart-page__heading {
    align-items: start;
    flex-direction: column;
  }

  .cart-item {
    grid-template-columns: minmax(0, 1fr);
  }

  .cart-item__media {
    width: 100%;
    max-width: 180px;
  }

  .cart-item__main,
  .cart-item__footer {
    flex-direction: column;
    align-items: start;
  }

  .cart-item__price-block,
  .cart-item__meta,
  .cart-item__quantity {
    justify-items: start;
  }

  .cart-summary__features {
    grid-template-columns: minmax(0, 1fr);
  }

  .cart-summary__total-caption {
    text-align: left;
  }
}
</style>
