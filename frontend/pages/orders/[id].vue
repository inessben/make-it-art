<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
      aria-labelledby="order-title"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Commande privée</p>
          <h1
            id="order-title"
            class="mt-4 break-all text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]"
          >
            {{ order ? "Commande " + order.id : "Détail de la commande" }}
          </h1>
          <p class="mt-4 max-w-2xl leading-7 text-[#A0ADB4]">
            {{ order ? presentation.title : "Le statut est chargé depuis votre espace privé." }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-transparent px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#6d8bff] hover:text-[#ffffff]"
          @click="navigateBack"
        >
          Retour aux commandes
        </button>
      </div>

      <div
        v-if="loading"
        class="mt-10 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
        role="status"
      >
        Chargement du dernier statut vérifié par le serveur...
      </div>

      <div
        v-else-if="errorMessage"
        class="mt-10 rounded-[24px] border border-[#7f1d1d] bg-[#2b1014] p-8 text-[#FECACA]"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <div v-else-if="order" class="mt-10 space-y-6">
        <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <div class="flex flex-col gap-5 sm:flex-row sm:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Statut vérifié</p>
              <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">
                {{ presentation.title }}
              </h2>
              <p class="mt-3 max-w-2xl leading-7 text-[#A0ADB4]">
                {{ presentation.message }}
              </p>
            </div>
            <span
              class="inline-flex h-fit items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              :class="statusToneClass"
            >
              {{ presentation.badgeLabel }}
            </span>
          </div>

          <NuxtLink
            v-if="presentation.action?.to"
            :to="orderActionTarget"
            class="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#4A6CF7] px-5 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
          >
            {{ presentation.action.label }}
          </NuxtLink>
        </div>

        <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Référence</p>
              <p class="mt-2 break-all text-sm font-semibold text-[#E6EDF7]">
                {{ order.id }}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Date</p>
              <p class="mt-2 text-lg text-[#A0ADB4]">
                {{ formatDate(order.createdAt) }}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Montant</p>
              <p class="mt-2 text-lg font-semibold text-[#E6EDF7]">
                {{ formatMoney(order.amount, order.currency) }}
              </p>
            </div>
          </div>
          <dl v-if="order.pricing" class="mt-6 grid gap-3 border-t border-[#1A1F2A] pt-5 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-[#A0ADB4]">Total HT</dt>
              <dd class="font-semibold text-[#E6EDF7]">
                {{ formatMoney(order.pricing.netAmount, order.currency) }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#A0ADB4]">
                TVA incluse ({{ formatRate(order.pricing.taxRateBps) }})
              </dt>
              <dd class="font-semibold text-[#E6EDF7]">
                {{ formatMoney(order.pricing.taxAmount, order.currency) }}
              </dd>
            </div>
            <div class="flex justify-between gap-4 border-t border-[#1A1F2A] pt-3">
              <dt class="font-semibold text-white">Total TTC</dt>
              <dd class="font-semibold text-white">
                {{ formatMoney(order.pricing.totalAmount, order.currency) }}
              </dd>
            </div>
          </dl>
        </div>

        <section
          v-if="order.invoices?.length"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
          aria-labelledby="invoices-title"
        >
          <h2 id="invoices-title" class="text-lg font-semibold text-[#E6EDF7]">Factures</h2>
          <div class="mt-5 grid gap-3">
            <a
              v-for="invoice in order.invoices"
              :key="invoice.id"
              :href="invoiceDownloadUrl(invoice)"
              class="flex items-center justify-between gap-4 rounded-2xl border border-[#1A1F2A] bg-[#0d1120] px-5 py-4 text-sm transition hover:border-[#4A6CF7]"
            >
              <span>
                <span class="block font-semibold text-white">{{ invoice.number }}</span>
                <span class="mt-1 block text-xs text-[#A0ADB4]">
                  Émise le {{ formatDate(invoice.issuedAt) }}
                </span>
              </span>
              <span class="font-semibold text-[#BFD0FF]">Télécharger le PDF</span>
            </a>
          </div>
        </section>

        <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Œuvres</h2>
          <div class="mt-5 space-y-4">
            <article
              v-for="(item, index) in order.items"
              :key="item.title + '-' + item.artistName + '-' + index"
              class="rounded-2xl border border-[#1A1F2A] bg-[#0d1120] p-4"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-base font-semibold text-[#E6EDF7]">
                    {{ item.title || "Œuvre" }}
                  </p>
                  <p class="mt-1 text-sm text-[#A0ADB4]">
                    {{ item.artistName || "Artiste" }} · Quantité
                    {{ item.quantity }}
                  </p>
                  <p class="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#BFD0FF]">
                    {{ formatArtworkLicenseType(item.licenseType) }}
                  </p>
                  <p
                    v-if="item.publicAccess?.withdrawnFromPublic"
                    class="mt-2 text-xs leading-5 text-[#A0ADB4]"
                  >
                    Cette œuvre n’est plus publique. Les informations et droits liés à votre achat
                    restent disponibles dans cette commande privée.
                  </p>
                </div>
                <span
                  class="inline-flex items-center rounded-full bg-[#1c3350] px-3 py-2 text-xs font-semibold text-[#67b7ff]"
                >
                  {{ formatMoney(item.unitAmount, item.currency) }} / unité
                </span>
              </div>

              <div
                v-if="item.delivery?.downloadRights || item.delivery?.certificate"
                class="mt-4 grid gap-3 border-t border-[#1A1F2A] pt-4 sm:grid-cols-2"
              >
                <div
                  v-if="item.delivery.downloadRights"
                  class="rounded-xl border border-[#1A1F2A] bg-[#090017] p-3"
                >
                  <p class="text-xs uppercase tracking-[0.14em] text-[#4A6CF7]">
                    Droits numériques
                  </p>
                  <p class="mt-2 text-sm font-semibold text-[#E6EDF7]">
                    {{ deliveryStatus(item.delivery.downloadRights.status).label }}
                  </p>
                  <p class="mt-1 text-xs leading-5 text-[#A0ADB4]">
                    {{ deliveryStatus(item.delivery.downloadRights.status).message }}
                  </p>
                  <p
                    v-if="item.delivery.downloadRights.status === 'ACTIVE'"
                    class="mt-2 text-xs text-[#A0ADB4]"
                  >
                    Téléchargements restants :
                    {{ item.delivery.downloadRights.remainingDownloads }} /
                    {{ item.delivery.downloadRights.downloadLimit }}
                  </p>
                  <a
                    v-if="canDownloadItem(item)"
                    :href="artworkDownloadUrl(item)"
                    class="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#4A6CF7] px-4 text-xs font-semibold text-black transition hover:bg-[#6D8BFF]"
                  >
                    Télécharger l'œuvre originale
                  </a>
                </div>

                <div
                  v-if="item.delivery.certificate"
                  class="rounded-xl border border-[#1A1F2A] bg-[#090017] p-3"
                >
                  <p class="text-xs uppercase tracking-[0.14em] text-[#4A6CF7]">
                    Certificat de propriété
                  </p>
                  <p class="mt-2 break-all text-sm font-semibold text-[#E6EDF7]">
                    {{ item.delivery.certificate.number }}
                  </p>
                  <p class="mt-1 text-xs text-[#A0ADB4]">
                    {{ deliveryStatus(item.delivery.certificate.status).label }} · émis le
                    {{ formatDate(item.delivery.certificate.issuedAt) }}
                  </p>
                  <details class="mt-3 text-xs text-[#71809A]">
                    <summary class="cursor-pointer text-[#A0ADB4]">Vérifier le certificat</summary>
                    <p class="mt-2 break-all">
                      Empreinte SHA-256 : {{ item.delivery.certificate.fingerprint }}
                    </p>
                  </details>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-if="order.payment" class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Paiement</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-[#1A1F2A] bg-[#0d1120] p-4">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Prestataire</p>
              <p class="mt-2 text-sm text-[#A0ADB4]">Stripe</p>
            </div>
            <div class="rounded-2xl border border-[#1A1F2A] bg-[#0d1120] p-4">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Statut interne</p>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                {{ getPaymentStatusLabel(order.payment.status) }}
              </p>
            </div>
          </div>
          <p class="mt-4 text-xs leading-6 text-[#71809A]">
            Seules les informations non sensibles confirmées côté serveur sont affichées ici.
          </p>
        </div>

        <section
          v-if="order.refunds?.length"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
          aria-labelledby="refunds-title"
        >
          <h2 id="refunds-title" class="text-lg font-semibold text-[#E6EDF7]">Remboursements</h2>
          <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
            Ces statuts proviennent de votre commande privée et sont confirmés côté serveur.
          </p>

          <div class="mt-5 grid gap-4">
            <article
              v-for="refund in order.refunds"
              :key="refund.id"
              class="rounded-2xl border bg-[#0d1120] p-5"
              :class="refundToneClass(refund.status)"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p class="font-semibold text-[#E6EDF7]">
                    {{ getRefundStatusPresentation(refund.status).label }}
                  </p>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-[#A0ADB4]">
                    {{ getRefundStatusPresentation(refund.status).message }}
                  </p>
                </div>
                <p class="shrink-0 text-lg font-semibold text-[#E6EDF7]">
                  {{ formatMoney(refund.amount, refund.currency) }}
                </p>
              </div>

              <div
                class="mt-4 flex flex-col gap-2 border-t border-[#1A1F2A] pt-4 text-xs text-[#71809A] sm:flex-row sm:justify-between"
              >
                <span>Demandé le {{ formatDate(refund.createdAt) }}</span>
                <span v-if="refund.reference" class="break-all">
                  Référence bancaire : {{ refund.reference }}
                </span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo, useRoute } from "#app";
import {
  getOrderStatusPresentation,
  getPaymentStatusLabel,
  getRefundStatusPresentation
} from "~/utils/order-status";
import { getDigitalDeliveryPresentation } from "~/utils/digital-delivery";
import { formatArtworkLicenseType } from "~/utils/marketplace";

definePageMeta({
  middleware: "auth"
});

const route = useRoute();
const loading = ref(true);
const errorMessage = ref("");
const order = ref(null);
const presentation = computed(() => getOrderStatusPresentation(order.value?.status));
const orderActionTarget = computed(() => {
  const target = presentation.value.action?.to;

  if (target !== "/checkout") {
    return target;
  }

  return {
    path: "/checkout",
    query: { order: order.value?.id }
  };
});
const statusToneClass = computed(() => {
  const tones = {
    success: "bg-[#10261A] text-[#9DE2B4]",
    error: "bg-[#2B1014] text-[#FECACA]",
    warning: "bg-[#2B220E] text-[#F7D990]",
    pending: "bg-[#1C3350] text-[#67B7FF]",
    neutral: "bg-[#1A1F2A] text-[#A0ADB4]"
  };

  return tones[presentation.value.tone] || tones.warning;
});

onMounted(loadOrder);

async function loadOrder() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const publicId = encodeURIComponent(String(route.params.id));
    const response = await $fetch("/api/v1/orders/" + publicId, {
      credentials: "include"
    });
    order.value = response.order;
  } catch {
    order.value = null;
    errorMessage.value = "Cette commande n’existe pas ou n’appartient pas à votre compte.";
  } finally {
    loading.value = false;
  }
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format(amount / 100);
}

function formatDate(value) {
  if (!value) {
    return "Date indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatRate(basisPoints) {
  return `${Number(basisPoints || 0) / 100} %`;
}

function invoiceDownloadUrl(invoice) {
  return `/api/v1/orders/${encodeURIComponent(order.value.id)}/invoices/${encodeURIComponent(
    invoice.id
  )}.pdf`;
}

function artworkDownloadUrl(item) {
  return `/api/v1/orders/${encodeURIComponent(order.value.id)}/download/${encodeURIComponent(
    item.id
  )}`;
}

function canDownloadItem(item) {
  const rights = item?.delivery?.downloadRights;
  return Boolean(item?.id && rights?.status === "ACTIVE" && Number(rights.remainingDownloads) > 0);
}

function refundToneClass(status) {
  const tones = {
    PENDING: "border-[#1C3350]",
    SUCCEEDED: "border-[#245C3C]",
    FAILED: "border-[#6C1F2D]"
  };

  return tones[status] || "border-[#1A1F2A]";
}

function deliveryStatus(status) {
  return getDigitalDeliveryPresentation(status);
}

function navigateBack() {
  return navigateTo("/orders");
}
</script>
