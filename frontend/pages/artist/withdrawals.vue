<template>
  <ArtistShell
    title="Withdrawals"
    description="Request a manual payout, track its review status and monitor what remains available from your artist balance."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        :disabled="loading"
        @click="loadWithdrawals"
      >
        {{ loading ? "Refreshing..." : "Refresh" }}
      </button>
    </template>

    <section class="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
          {{ card.label }}
        </p>
        <p class="mt-4 text-3xl font-semibold text-white">
          {{ card.value }}
        </p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
          {{ card.description }}
        </p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Request payout</p>
        <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Create a withdrawal request</h2>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
          Requests are reviewed manually by the admin team before being approved and marked as paid.
        </p>

        <div
          v-if="message"
          class="mt-5 rounded-2xl border px-5 py-4 text-sm"
          :class="
            messageType === 'error'
              ? 'border-[#7f1d1d] bg-[#2b1014] text-[#FECACA]'
              : 'border-[#24467A] bg-[#07152D] text-[#BFDBFE]'
          "
        >
          {{ message }}
        </div>

        <form class="mt-6 grid gap-4" @submit.prevent="submitWithdrawal">
          <label class="grid gap-2">
            <span class="text-sm font-semibold text-[#DCE7FF]">Amount (EUR)</span>
            <input
              v-model="form.amount"
              type="text"
              inputmode="decimal"
              placeholder="120.00"
              class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-semibold text-[#DCE7FF]">Note for admin (optional)</span>
            <textarea
              v-model="form.note"
              rows="4"
              maxlength="1000"
              placeholder="Add useful payout context if needed."
              class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            />
          </label>

          <div
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4 text-sm text-[#A0ADB4]"
          >
            <p>
              Available to withdraw:
              <span class="font-semibold text-[#E6EDF7]">{{
                finance.availableToWithdraw || "EUR 0.00"
              }}</span>
            </p>
            <p class="mt-2">
              Minimum request amount:
              <span class="font-semibold text-[#E6EDF7]">{{
                finance.minimumRequestAmount || "EUR 25.00"
              }}</span>
            </p>
          </div>

          <button
            type="submit"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting"
          >
            {{ submitting ? "Submitting..." : "Submit withdrawal request" }}
          </button>
        </form>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">History</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Withdrawal requests</h2>
          </div>
          <span class="rounded-full bg-[#10151E] px-3 py-1 text-xs font-semibold text-[#9DB2FF]">
            {{ summary.totalRequests || 0 }} request(s)
          </span>
        </div>

        <div
          v-if="errorMessage"
          class="mt-6 rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
        >
          {{ errorMessage }}
        </div>

        <div
          v-else-if="loading"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Loading withdrawal requests...
        </div>

        <div
          v-else-if="requests.length === 0"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          No withdrawal requests yet.
        </div>

        <div v-else class="mt-6 grid gap-3">
          <article
            v-for="request in requests"
            :key="request.publicId"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                    :class="statusClass(request.status)"
                  >
                    {{ request.status }}
                  </span>
                  <span class="text-xs uppercase tracking-[0.12em] text-[#7F8A99]">
                    {{ formatDate(request.createdAt) }}
                  </span>
                </div>
                <p class="mt-4 text-lg font-semibold text-white">
                  {{ request.amountLabel }}
                </p>
                <p class="mt-2 break-all text-sm text-[#8E9AA7]">
                  {{ request.publicId }}
                </p>
                <p v-if="request.note" class="mt-3 text-sm leading-6 text-[#A0ADB4]">
                  {{ request.note }}
                </p>
                <p v-if="request.adminNote" class="mt-3 text-sm leading-6 text-[#BFDBFE]">
                  Admin note: {{ request.adminNote }}
                </p>
                <p v-if="request.payoutReference" class="mt-2 text-sm text-[#9DB2FF]">
                  Payout reference: {{ request.payoutReference }}
                </p>
              </div>

              <button
                v-if="request.status === 'REQUESTED'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-4 py-2 text-sm font-semibold text-[#FECACA] transition hover:bg-[#3b151b] disabled:opacity-60"
                :disabled="cancelingPublicId === request.publicId"
                @click="cancelRequest(request.publicId)"
              >
                {{ cancelingPublicId === request.publicId ? "Canceling..." : "Cancel request" }}
              </button>
            </div>
          </article>
        </div>
      </article>
    </section>
  </ArtistShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "artist"
});

const loading = ref(true);
const submitting = ref(false);
const cancelingPublicId = ref("");
const errorMessage = ref("");
const message = ref("");
const messageType = ref("info");
const finance = ref({});
const summary = ref({});
const requests = ref([]);
const form = reactive({
  amount: "",
  note: ""
});

const summaryCards = computed(() => [
  {
    label: "Available to withdraw",
    value: finance.value.availableToWithdraw || "EUR 0.00",
    description: "Current balance still available after pending and completed payouts."
  },
  {
    label: "Pending withdrawals",
    value: finance.value.pendingWithdrawalAmount || "EUR 0.00",
    description: "Requests already under admin review or approved for payment."
  },
  {
    label: "Paid out",
    value: finance.value.paidOutAmount || "EUR 0.00",
    description: "Artist balance already settled manually."
  },
  {
    label: "Lifetime available",
    value: finance.value.lifetimeAvailableBalance || "EUR 0.00",
    description: "Net artist earnings after refunds, before payout deductions."
  }
]);

onMounted(async () => {
  await loadWithdrawals();
});

async function fetchCsrfToken() {
  const response = await $fetch("/api/v1/security/csrf-token", {
    credentials: "include"
  });

  return response.csrfToken;
}

function resetFlash() {
  message.value = "";
  messageType.value = "info";
  errorMessage.value = "";
}

async function loadWithdrawals() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/artists/me/withdrawals", {
      credentials: "include"
    });

    finance.value = response.finance || {};
    summary.value = response.summary || {};
    requests.value = response.requests || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/artist-profile");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load artist withdrawals.";
  } finally {
    loading.value = false;
  }
}

async function submitWithdrawal() {
  submitting.value = true;
  resetFlash();

  try {
    const csrfToken = await fetchCsrfToken();

    const response = await $fetch("/api/artists/me/withdrawals", {
      method: "POST",
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken
      },
      body: {
        amount: form.amount,
        note: form.note
      }
    });

    message.value = response.message || "Withdrawal request submitted.";
    form.amount = "";
    form.note = "";
    await loadWithdrawals();
  } catch (error) {
    messageType.value = "error";
    message.value = error?.data?.message || "Unable to submit this withdrawal request.";
  } finally {
    submitting.value = false;
  }
}

async function cancelRequest(publicId) {
  cancelingPublicId.value = publicId;
  resetFlash();

  try {
    const csrfToken = await fetchCsrfToken();

    const response = await $fetch(`/api/artists/me/withdrawals/${publicId}/cancel`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken
      }
    });

    message.value = response.message || "Withdrawal request canceled.";
    await loadWithdrawals();
  } catch (error) {
    messageType.value = "error";
    message.value = error?.data?.message || "Unable to cancel this withdrawal request.";
  } finally {
    cancelingPublicId.value = "";
  }
}

function statusClass(status) {
  if (status === "PAID") {
    return "bg-[#12301F] text-[#86EFAC]";
  }

  if (status === "APPROVED") {
    return "bg-[#1E2540] text-[#9DB2FF]";
  }

  if (status === "REJECTED" || status === "CANCELED") {
    return "bg-[#3A1620] text-[#FECACA]";
  }

  return "bg-[#2A2410] text-[#FDE68A]";
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
</script>
