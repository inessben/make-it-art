<template>
  <section
    class="overflow-hidden border border-slate-800 bg-slate-950 text-slate-100"
    aria-live="polite"
    :aria-busy="loading || submitting || creating"
  >
    <div class="border-b border-slate-700 px-5 py-6 sm:px-7 lg:px-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-400"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3 4.5 7v10L12 21l7.5-4V7L12 3Z"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path
                d="m8.5 12 2.2 2.2 4.8-5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <h2 class="text-2xl font-semibold tracking-tight text-white">
            {{ activeWallet ? "Embedded wallet" : "Create my digital wallet" }}
          </h2>
        </div>
        <span
          v-if="activeWallet"
          class="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-400" />
          {{ activeStatusLabel }}
        </span>
      </div>
    </div>

    <div class="p-5 sm:p-7 lg:p-8">
      <div
        v-if="loading"
        class="flex min-h-48 items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-950 text-sm text-slate-400"
      >
        <span
          class="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-violet-600"
          aria-hidden="true"
        />
        Loading wallet preferences...
      </div>

      <template v-else-if="consentState === 'unverified'">
        <div class="rounded-lg border border-amber-900 bg-amber-950 p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-wider text-amber-200">
            Email verification required
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Verify your account first</h3>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-amber-100">
            Verify your email address before choosing whether to create a digital wallet.
          </p>
        </div>
      </template>

      <template v-else-if="activeWallet">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]">
          <article class="rounded-lg border border-slate-800 bg-slate-950 p-5 sm:p-6">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Public wallet address
                </p>
                <p
                  class="mt-3 font-mono text-xl font-semibold tracking-tight text-white sm:text-2xl"
                >
                  {{ abbreviatedAddress }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:bg-slate-900"
                @click="copyAddress"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect
                    x="6"
                    y="6"
                    width="9"
                    height="9"
                    rx="1.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <path
                    d="M4 12H3.5A1.5 1.5 0 0 1 2 10.5v-7A1.5 1.5 0 0 1 3.5 2h7A1.5 1.5 0 0 1 12 3.5V4"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                </svg>
                {{ addressCopied ? "Address copied" : "Copy address" }}
              </button>
            </div>

            <dl
              class="mt-7 grid gap-px overflow-hidden rounded border border-slate-800 bg-slate-800 sm:grid-cols-3"
            >
              <div class="bg-slate-950 p-4">
                <dt class="text-xs uppercase tracking-wider text-slate-500">Wallet type</dt>
                <dd class="mt-2 text-sm font-semibold text-slate-100">Embedded</dd>
              </div>
              <div class="bg-slate-950 p-4">
                <dt class="text-xs uppercase tracking-wider text-slate-500">Network</dt>
                <dd class="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <span
                    class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white"
                    >B</span
                  >
                  Base
                </dd>
              </div>
              <div class="bg-slate-950 p-4">
                <dt class="text-xs uppercase tracking-wider text-slate-500">Provider</dt>
                <dd class="mt-2 text-sm font-semibold text-slate-100">Coinbase CDP</dd>
              </div>
            </dl>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                :href="baseScanUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 px-5 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:bg-slate-900"
              >
                View on BaseScan
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M11 3h6v6M17 3l-8 8"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M15 11v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"
                    stroke="currentColor"
                    stroke-width="1.6"
                  />
                </svg>
              </a>
              <button
                v-if="!exportVisible"
                type="button"
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-violet-600 px-5 text-sm font-semibold text-slate-950 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="exportLoading"
                @click="openSecureExport"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 2v10m0 0 4-4m-4 4L6 8M3 15v2h14v-2"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ exportLoading ? "Preparing secure export..." : "Export wallet securely" }}
              </button>
            </div>
          </article>

          <aside class="rounded-lg border border-slate-800 bg-black p-5 sm:p-6">
            <div class="flex items-center gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-900 text-violet-400"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M5 8V6a5 5 0 0 1 10 0v2M4 8h12v9H4V8Z"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M10 11v3"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-white">You remain in control</h3>
            </div>
            <p class="mt-5 text-sm leading-6 text-slate-400">
              Your wallet is secured by Coinbase infrastructure. Make It Art never stores or reads
              your private key.
            </p>
            <div class="mt-6 border-t border-slate-800 pt-5">
              <p class="text-xs leading-5 text-slate-500">
                Export only in a private place. Anyone with your private key can control the wallet
                and its assets.
              </p>
            </div>
          </aside>
        </div>

        <div
          v-show="exportVisible"
          class="mt-6 rounded-lg border border-amber-900 bg-amber-950 p-5 sm:p-6"
        >
          <div class="flex items-start gap-4">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/10 text-amber-200"
              >!</span
            >
            <div>
              <p class="font-semibold text-amber-100">Private key export</p>
              <p class="mt-2 text-sm leading-6 text-amber-100">
                Coinbase copies the key directly from a secure frame. Make It Art never receives it.
                Keep it secret and never share it.
              </p>
            </div>
          </div>
          <div ref="exportContainer" class="mt-5 min-h-12" />
        </div>
        <p
          v-if="exportMessage"
          class="mt-4 rounded border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-300"
        >
          {{ exportMessage }}
        </p>
      </template>

      <template v-else-if="walletStatus === 'pending'">
        <div class="rounded-lg border border-slate-700 bg-slate-900 p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Creation in progress
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Securing your Base wallet</h3>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Coinbase is creating and securing your wallet. This can take a few seconds.
          </p>
          <div v-if="creating" class="mt-6 flex items-center gap-3 text-sm text-slate-400">
            <span
              class="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-violet-600"
              aria-hidden="true"
            />
            Wallet creation in progress...
          </div>
          <button
            v-else
            type="button"
            class="mt-6 min-h-12 rounded bg-violet-600 px-6 text-sm font-semibold text-slate-950 transition hover:bg-violet-500"
            @click="resumeCreation"
          >
            Resume wallet creation
          </button>
        </div>
      </template>

      <template v-else-if="walletStatus === 'detached'">
        <div class="rounded-lg border border-amber-900 bg-amber-950 p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-wider text-amber-200">Detached</p>
          <h3 class="mt-3 text-xl font-semibold text-white">Wallet no longer linked</h3>
          <p class="mt-3 text-sm leading-6 text-amber-100">
            This wallet is detached from your Make It Art account.
          </p>
        </div>
      </template>

      <template v-else-if="walletStatus === 'failed' || walletStatus === 'retry_required'">
        <div class="rounded-lg border border-rose-900 bg-rose-950 p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-wider text-rose-200">
            {{ walletStatus === "retry_required" ? "Retry required" : "Creation failed" }}
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Wallet creation did not complete</h3>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-rose-200">
            No wallet has been activated. You can safely retry without creating a duplicate.
          </p>
          <button
            type="button"
            class="mt-6 min-h-12 rounded bg-violet-600 px-6 text-sm font-semibold text-slate-950 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creating"
            @click="retryCreation"
          >
            {{ creating ? "Retrying..." : "Retry wallet creation" }}
          </button>
        </div>
      </template>

      <template v-else-if="consentState === 'accepted'">
        <div class="rounded-lg border border-slate-700 bg-slate-900 p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Consent recorded
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Continue wallet creation</h3>
          <p class="mt-3 text-sm leading-6 text-slate-300">
            Your consent is recorded. Continue to create your Base wallet with Coinbase.
          </p>
          <button
            type="button"
            class="mt-6 min-h-12 rounded bg-violet-600 px-6 text-sm font-semibold text-slate-950 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creating"
            @click="startCreation"
          >
            {{ creating ? "Creating..." : "Continue wallet creation" }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
          <div class="rounded-lg border border-slate-800 bg-slate-850 p-6 sm:p-8">
            <h3 class="text-xl font-semibold text-white">
              A wallet for future digital acquisitions
            </h3>
            <div class="mt-5 grid gap-3 text-sm leading-6 text-slate-400">
              <p>The wallet is optional and your Make It Art account works without it.</p>
              <p>It will support future digital acquisitions while remaining under your control.</p>
              <p>You will be able to connect an external wallet in a later version.</p>
            </div>
            <p
              v-if="consentState === 'declined'"
              class="mt-5 rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300"
            >
              You previously chose not to create a wallet. You can change your decision at any time.
            </p>
            <div class="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="min-h-12 rounded bg-violet-600 px-6 text-sm font-semibold text-slate-950 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submitting || creating"
                @click="recordConsent(true)"
              >
                {{ submitting || creating ? "Creating..." : "Create my digital wallet" }}
              </button>
              <button
                v-if="consentState === 'undecided'"
                type="button"
                class="min-h-12 rounded border border-slate-750 bg-slate-900 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submitting || creating"
                @click="recordConsent(false)"
              >
                Not now
              </button>
            </div>
          </div>
          <aside class="rounded-lg border border-slate-800 bg-slate-800 p-6">
            <p class="text-sm leading-6 text-slate-300">
              Your public address is visible on-chain, while wallet authentication and key export
              remain protected by Coinbase CDP.
            </p>
          </aside>
        </div>
      </template>

      <p
        v-if="successMessage"
        class="mt-5 rounded border border-emerald-800 bg-emerald-950 px-5 py-4 text-sm text-emerald-200"
      >
        {{ successMessage }}
      </p>
      <p
        v-if="errorMessage"
        class="mt-5 rounded border border-rose-900 bg-rose-950 px-5 py-4 text-sm text-rose-200"
      >
        {{ errorMessage }}
      </p>
      <p v-if="displayedTechnicalCode" class="mt-3 font-mono text-xs text-slate-500">
        Technical code: {{ displayedTechnicalCode }}
      </p>
    </div>
  </section>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/auth";
import { useEmbeddedWallet } from "~/composables/useEmbeddedWallet";
import { getWalletConsentState } from "~/utils/wallet-consent";
import {
  copyWalletAddress,
  formatWalletAddress,
  getBaseScanAddressUrl,
  getWalletDiagnosticCode,
  getWalletStatusLabel
} from "~/utils/embedded-wallet-creation";

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const {
  activeWallet,
  consent,
  createSecureExport,
  createWallet,
  currentWallet,
  refreshWallets,
  resumeWallet,
  retryWallet,
  status,
  errorCode
} = useEmbeddedWallet();
const loading = ref(true);
const submitting = ref(false);
const creating = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const technicalCode = ref("");
const addressCopied = ref(false);
const exportContainer = ref(null);
const exportLoading = ref(false);
const exportVisible = ref(false);
const exportMessage = ref("");
let cleanupSecureExport;

const consentState = computed(() =>
  getWalletConsentState({
    verified: user.value?.verified === true,
    consent: consent.value
  })
);
const walletStatus = computed(() => status.value);
const displayedTechnicalCode = computed(() => technicalCode.value || errorCode.value || "");
const abbreviatedAddress = computed(() => formatWalletAddress(activeWallet.value?.address));
const activeStatusLabel = computed(() => getWalletStatusLabel(activeWallet.value?.status));
const baseScanUrl = computed(() => getBaseScanAddressUrl(activeWallet.value?.address));

onBeforeUnmount(() => cleanupSecureExport?.());

onMounted(async () => {
  try {
    await refreshWallets();
  } catch (error) {
    if (error?.statusCode !== 403) {
      errorMessage.value =
        error?.data?.message || "Unable to load your wallet preferences right now.";
    }
  } finally {
    loading.value = false;
  }
});

async function recordConsent(accepted) {
  submitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/wallets/consent", {
      method: "POST",
      credentials: "include",
      body: { accepted }
    });
    consent.value = response.consent;

    if (accepted) {
      await startCreation();
    } else {
      successMessage.value = "No wallet will be created. Your account remains fully available.";
    }
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to save your choice right now.";
  } finally {
    submitting.value = false;
  }
}

function creationErrorMessage(error) {
  if (error?.statusCode === 429 || error?.data?.code === "WALLET_RATE_LIMITED") {
    return "Too many wallet attempts were made. Wait briefly, then retry once.";
  }

  return (
    error?.data?.message ||
    (error?.code === "CDP_TIMEOUT"
      ? "Coinbase did not respond in time. You can retry safely."
      : "Unable to create your wallet right now. You can retry safely.")
  );
}

async function runCreation(action) {
  creating.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  technicalCode.value = "";

  try {
    await action();
    successMessage.value = "Your Base wallet is active.";
  } catch (error) {
    technicalCode.value = getWalletDiagnosticCode(error);
    errorMessage.value = creationErrorMessage(error);
  } finally {
    creating.value = false;
  }
}

function startCreation() {
  return runCreation(() => createWallet(user.value?.id));
}

function resumeCreation() {
  return runCreation(() => resumeWallet(currentWallet.value, user.value?.id));
}

function retryCreation() {
  return runCreation(() => retryWallet(currentWallet.value, user.value?.id));
}

async function copyAddress() {
  if (!(await copyWalletAddress(activeWallet.value?.address))) return;
  addressCopied.value = true;
  window.setTimeout(() => {
    addressCopied.value = false;
  }, 2000);
}

async function openSecureExport() {
  exportLoading.value = true;
  exportMessage.value = "";
  exportVisible.value = true;
  await nextTick();

  try {
    cleanupSecureExport?.();
    const result = await createSecureExport(
      activeWallet.value,
      exportContainer.value,
      (exportStatus, message) => {
        if (exportStatus === "success") exportMessage.value = "Private key copied securely.";
        if (exportStatus === "error")
          exportMessage.value = message || "Secure export could not be completed.";
      }
    );
    cleanupSecureExport = result.cleanup;
  } catch (error) {
    exportVisible.value = false;
    exportMessage.value =
      error?.message || "Secure export could not be prepared. Please try again.";
  } finally {
    exportLoading.value = false;
  }
}
</script>
