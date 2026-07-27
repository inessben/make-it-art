<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-8"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-widest text-violet-700">Moyens de paiement</p>
          <h1 class="mt-4 text-title-2">Mes cartes enregistrées</h1>
          <p class="mt-4 max-w-2xl leading-7 text-slate-400">
            Stripe conserve vos données bancaires. Make It Art affiche uniquement la marque, les
            quatre derniers chiffres et la date d’expiration.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-violet-700 bg-transparent px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:text-white"
          @click="navigateBack"
        >
          Retour au compte
        </button>
      </div>

      <p
        v-if="feedbackMessage"
        class="mt-8 rounded-2xl border px-5 py-4 text-sm"
        :class="
          feedbackType === 'success'
            ? 'border-green-900 bg-green-950/60 text-green-200'
            : 'border-red-900 bg-red-950/70 text-red-200'
        "
        :role="feedbackType === 'error' ? 'alert' : 'status'"
      >
        {{ feedbackMessage }}
      </p>

      <AppStatePanel
        v-if="loading"
        class="mt-10"
        type="loading"
        title="Chargement des cartes"
        message="Stripe vérifie vos moyens de paiement enregistrés."
      />

      <AppStatePanel
        v-else-if="loadError"
        class="mt-10"
        type="error"
        title="Cartes temporairement indisponibles"
        message="La liste n’a pas pu être récupérée. Aucun moyen de paiement n’a été modifié."
        action-label="Réessayer"
        @action="loadPaymentMethods"
      />

      <AppStatePanel
        v-else-if="paymentMethods.length === 0"
        class="mt-10"
        type="empty"
        title="Aucune carte enregistrée"
        message="Lors d’un prochain achat, cochez l’option proposée par Stripe dans le formulaire de paiement pour enregistrer votre carte."
      />

      <div v-else class="mt-10 grid gap-4" aria-live="polite">
        <article
          v-for="paymentMethod in paymentMethods"
          :key="paymentMethod.id"
          class="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-black/40 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-4">
            <span
              class="grid h-12 w-16 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold uppercase text-slate-200"
              aria-hidden="true"
            >
              {{ formatBrand(paymentMethod.brand) }}
            </span>
            <div>
              <p class="font-semibold text-white">
                {{ formatBrand(paymentMethod.brand) }} •••• {{ paymentMethod.last4 }}
              </p>
              <p class="mt-1 text-sm text-slate-400">
                Expire {{ formatExpiry(paymentMethod.expMonth, paymentMethod.expYear) }}
              </p>
            </div>
          </div>

          <div v-if="pendingRemovalId === paymentMethod.id" class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
              :disabled="Boolean(removingId)"
              @click="pendingRemovalId = ''"
            >
              Annuler
            </button>
            <button
              type="button"
              class="rounded-xl border border-red-800 bg-red-950/70 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/70 disabled:opacity-50"
              :disabled="Boolean(removingId)"
              @click="removePaymentMethod(paymentMethod.id)"
            >
              {{ removingId === paymentMethod.id ? "Suppression…" : "Confirmer la suppression" }}
            </button>
          </div>
          <button
            v-else
            type="button"
            class="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/60"
            :disabled="Boolean(removingId)"
            @click="pendingRemovalId = paymentMethod.id"
          >
            Supprimer
          </button>
        </article>
      </div>

      <p class="mt-8 text-sm leading-6 text-slate-500">
        Supprimer une carte la détache de votre compte Stripe Make It Art. Cette action n’annule et
        ne rembourse aucune commande passée. Consultez notre
        <NuxtLink to="/privacy" class="text-violet-400 underline"
          >politique de confidentialité</NuxtLink
        >.
      </p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "auth"
});

const paymentMethods = ref([]);
const loading = ref(true);
const loadError = ref(false);
const pendingRemovalId = ref("");
const removingId = ref("");
const feedbackMessage = ref("");
const feedbackType = ref("success");

onMounted(loadPaymentMethods);

async function loadPaymentMethods() {
  loading.value = true;
  loadError.value = false;

  try {
    const response = await $fetch("/api/v1/payment-methods", {
      credentials: "include"
    });
    paymentMethods.value = Array.isArray(response.paymentMethods) ? response.paymentMethods : [];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function getCsrfToken() {
  return $fetch("/api/v1/security/csrf-token", {
    credentials: "include"
  });
}

async function removePaymentMethod(paymentMethodId) {
  if (removingId.value) return;

  removingId.value = paymentMethodId;
  feedbackMessage.value = "";

  try {
    const csrf = await getCsrfToken();
    await $fetch(`/api/v1/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken }
    });
    paymentMethods.value = paymentMethods.value.filter(
      (paymentMethod) => paymentMethod.id !== paymentMethodId
    );
    pendingRemovalId.value = "";
    feedbackType.value = "success";
    feedbackMessage.value = "La carte a été supprimée de vos moyens de paiement enregistrés.";
  } catch {
    feedbackType.value = "error";
    feedbackMessage.value =
      "La carte n’a pas pu être supprimée. Aucun autre moyen de paiement n’a été modifié.";
  } finally {
    removingId.value = "";
  }
}

function formatBrand(value) {
  const labels = {
    amex: "American Express",
    mastercard: "Mastercard",
    visa: "Visa"
  };
  return labels[value] || "Carte";
}

function formatExpiry(month, year) {
  if (!Number.isSafeInteger(month) || !Number.isSafeInteger(year)) return "—";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function navigateBack() {
  return navigateTo("/account-settings");
}
</script>
