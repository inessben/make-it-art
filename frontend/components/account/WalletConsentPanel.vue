<template>
  <section
    class="overflow-hidden rounded-lg border border-[#1E293B] bg-[#020617] text-[#F1F5F9]"
    aria-live="polite"
    :aria-busy="loading || submitting || creating"
  >
    <div class="border-b border-[#1E293B] px-5 py-6 sm:px-7 lg:px-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-violet-400"
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
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Coinbase CDP
            </p>
          </div>
          <h2 class="mt-4 text-2xl font-semibold tracking-[-0.02em] text-white">
            {{ activeWallet ? "Embedded wallet" : "Create my digital wallet" }}
          </h2>
        </div>
        <span
          v-if="activeWallet"
          class="inline-flex w-fit items-center gap-2 rounded-full border border-[#245C3C] bg-[#0A2115] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9DE2B4]"
        >
          <span class="h-2 w-2 rounded-full bg-[#5CD68A]" />
          {{ activeStatusLabel }}
        </span>
      </div>
    </div>

    <div class="p-5 sm:p-7 lg:p-8">
      <div
        v-if="loading"
        class="flex min-h-48 items-center justify-center gap-3 rounded-lg border border-[#1E293B] bg-[#020617] text-sm text-[#94A3B8]"
      >
        <span
          class="h-5 w-5 animate-spin rounded-full border-2 border-[#334155] border-t-[#7C3AED]"
          aria-hidden="true"
        />
        Loading wallet preferences...
      </div>

      <template v-else-if="consentState === 'unverified'">
        <div class="rounded-lg border border-[#2A2410] bg-[#171308] p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#FDE68A]">
            Email verification required
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Verify your account first</h3>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-[#C9BFA0]">
            Verify your email address before choosing whether to create a digital wallet.
          </p>
        </div>
      </template>

      <template v-else-if="activeWallet">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]">
          <article class="rounded-lg border border-[#1E293B] bg-[#020617] p-5 sm:p-6">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  Public wallet address
                </p>
                <p
                  class="mt-3 font-mono text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl"
                >
                  {{ abbreviatedAddress }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded border border-[#334155] bg-[#0F172A] px-4 text-sm font-semibold text-[#F1F5F9] transition hover:border-[#7C3AED] hover:bg-[#1E293B]"
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
              class="mt-7 grid gap-px overflow-hidden rounded border border-[#1E293B] bg-[#1E293B] sm:grid-cols-3"
            >
              <div class="bg-[#020617] p-4">
                <dt class="text-[11px] uppercase tracking-[0.16em] text-[#64748B]">Wallet type</dt>
                <dd class="mt-2 text-sm font-semibold text-[#F1F5F9]">Embedded</dd>
              </div>
              <div class="bg-[#020617] p-4">
                <dt class="text-[11px] uppercase tracking-[0.16em] text-[#64748B]">Network</dt>
                <dd class="mt-2 flex items-center gap-2 text-sm font-semibold text-[#F1F5F9]">
                  <span
                    class="flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-[10px] font-bold text-white"
                    >B</span
                  >
                  Base
                </dd>
              </div>
              <div class="bg-[#020617] p-4">
                <dt class="text-[11px] uppercase tracking-[0.16em] text-[#64748B]">Provider</dt>
                <dd class="mt-2 text-sm font-semibold text-[#F1F5F9]">Coinbase CDP</dd>
              </div>
            </dl>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                :href="baseScanUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-[#334155] bg-[#0F172A] px-5 text-sm font-semibold text-[#F1F5F9] transition hover:border-[#7C3AED] hover:bg-[#1E293B]"
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
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7C3AED] px-5 text-sm font-semibold text-[#020617] transition hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60"
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

          <aside
            class="rounded-lg border border-[#1E293B] bg-gradient-to-br from-slate-950 to-black p-5 sm:p-6"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded border border-[#334155] bg-[#0F172A] text-violet-400"
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
            <p class="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
              Self-custody security
            </p>
            <h3 class="mt-3 text-lg font-semibold text-white">You remain in control</h3>
            <p class="mt-3 text-sm leading-6 text-[#94A3B8]">
              Your wallet is secured by Coinbase infrastructure. Make It Art never stores or reads
              your private key.
            </p>
            <div class="mt-6 border-t border-[#1E293B] pt-5">
              <p class="text-xs leading-5 text-[#64748B]">
                Export only in a private place. Anyone with your private key can control the wallet
                and its assets.
              </p>
            </div>
          </aside>
        </div>

        <div
          v-show="exportVisible"
          class="mt-6 rounded-lg border border-[#2A2410] bg-[#171308] p-5 sm:p-6"
        >
          <div class="flex items-start gap-4">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDE68A]/10 text-[#FDE68A]"
              >!</span
            >
            <div>
              <p class="font-semibold text-[#FFF4C2]">Private key export</p>
              <p class="mt-2 text-sm leading-6 text-[#C9BFA0]">
                Coinbase copies the key directly from a secure frame. Make It Art never receives it.
                Keep it secret and never share it.
              </p>
            </div>
          </div>
          <div ref="exportContainer" class="mt-5 min-h-12" />
        </div>
        <p
          v-if="exportMessage"
          class="mt-4 rounded border border-[#334155] bg-[#0F172A] px-5 py-4 text-sm text-slate-300"
        >
          {{ exportMessage }}
        </p>
      </template>

      <template v-else-if="walletStatus === 'pending'">
        <div class="rounded-lg border border-[#334155] bg-[#0F172A] p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Creation in progress
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Securing your Base wallet</h3>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Coinbase is creating and securing your wallet. This can take a few seconds.
          </p>
          <div v-if="creating" class="mt-6 flex items-center gap-3 text-sm text-[#94A3B8]">
            <span
              class="h-5 w-5 animate-spin rounded-full border-2 border-[#334155] border-t-[#7C3AED]"
              aria-hidden="true"
            />
            Wallet creation in progress...
          </div>
          <button
            v-else
            type="button"
            class="mt-6 min-h-12 rounded bg-[#7C3AED] px-6 text-sm font-semibold text-[#020617] transition hover:bg-[#8B5CF6]"
            @click="resumeCreation"
          >
            Resume wallet creation
          </button>
        </div>
      </template>

      <template v-else-if="walletStatus === 'detached'">
        <div class="rounded-lg border border-[#2A2410] bg-[#171308] p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#FDE68A]">Detached</p>
          <h3 class="mt-3 text-xl font-semibold text-white">Wallet no longer linked</h3>
          <p class="mt-3 text-sm leading-6 text-[#C9BFA0]">
            This wallet is detached from your Make It Art account.
          </p>
        </div>
      </template>

      <template v-else-if="walletStatus === 'failed' || walletStatus === 'retry_required'">
        <div class="rounded-lg border border-[#6C1F2D] bg-[#1D0B10] p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#FBC8D0]">
            {{ walletStatus === "retry_required" ? "Retry required" : "Creation failed" }}
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Wallet creation did not complete</h3>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-[#FBC8D0]">
            No wallet has been activated. You can safely retry without creating a duplicate.
          </p>
          <button
            type="button"
            class="mt-6 min-h-12 rounded bg-[#7C3AED] px-6 text-sm font-semibold text-[#020617] transition hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creating"
            @click="retryCreation"
          >
            {{ creating ? "Retrying..." : "Retry wallet creation" }}
          </button>
        </div>
      </template>

      <template v-else-if="consentState === 'accepted'">
        <div class="rounded-lg border border-[#334155] bg-[#0F172A] p-6 sm:p-8">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Consent recorded
          </p>
          <h3 class="mt-3 text-xl font-semibold text-white">Continue wallet creation</h3>
          <p class="mt-3 text-sm leading-6 text-slate-300">
            Your consent is recorded. Continue to create your Base wallet with Coinbase.
          </p>
          <button
            type="button"
            class="mt-6 min-h-12 rounded bg-[#7C3AED] px-6 text-sm font-semibold text-[#020617] transition hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creating"
            @click="startCreation"
          >
            {{ creating ? "Creating..." : "Continue wallet creation" }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
          <div class="rounded-lg border border-[#1E293B] bg-[#020617] p-6 sm:p-8">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
              Optional feature
            </p>
            <h3 class="mt-3 text-xl font-semibold text-white">
              A wallet for future digital acquisitions
            </h3>
            <div class="mt-5 grid gap-3 text-sm leading-6 text-[#94A3B8]">
              <p>The wallet is optional and your Make It Art account works without it.</p>
              <p>It will support future digital acquisitions while remaining under your control.</p>
              <p>You will be able to connect an external wallet in a later version.</p>
            </div>
            <p
              v-if="consentState === 'declined'"
              class="mt-5 rounded border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-sm text-[#C8D0DA]"
            >
              You previously chose not to create a wallet. You can change your decision at any time.
            </p>
            <div class="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="min-h-12 rounded bg-[#7C3AED] px-6 text-sm font-semibold text-[#020617] transition hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submitting || creating"
                @click="recordConsent(true)"
              >
                {{ submitting || creating ? "Creating..." : "Create my digital wallet" }}
              </button>
              <button
                v-if="consentState === 'undecided'"
                type="button"
                class="min-h-12 rounded border border-[#334155] bg-[#0F172A] px-6 text-sm font-semibold text-[#F1F5F9] transition hover:bg-[#1F273A] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submitting || creating"
                @click="recordConsent(false)"
              >
                Not now
              </button>
            </div>
          </div>
          <aside
            class="rounded-lg border border-[#1E293B] bg-gradient-to-br from-slate-950 to-black p-6"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">
              Built on Base
            </p>
            <p class="mt-4 text-sm leading-6 text-[#94A3B8]">
              Your public address is visible on-chain, while wallet authentication and key export
              remain protected by Coinbase CDP.
            </p>
          </aside>
        </div>
      </template>

      <p
        v-if="successMessage"
        class="mt-5 rounded border border-[#245C3C] bg-[#0A2115] px-5 py-4 text-sm text-[#9DE2B4]"
      >
        {{ successMessage }}
      </p>
      <p
        v-if="errorMessage"
        class="mt-5 rounded border border-[#6C1F2D] bg-[#1D0B10] px-5 py-4 text-sm text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </p>
      <p v-if="technicalCode" class="mt-3 font-mono text-xs text-[#64748B]">
        Technical code: {{ technicalCode }}
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
  status
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
