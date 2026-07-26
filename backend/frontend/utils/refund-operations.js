const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFUND_REASONS = new Set(["CUSTOMER_REQUEST", "DUPLICATE", "FRAUDULENT"]);

export function parseRefundAmountToCents(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [euros, decimal = ""] = normalized.split(".");
  const amount = Number(euros) * 100 + Number(decimal.padEnd(2, "0"));

  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function canRequestRefund(order) {
  return Boolean(
    order?.canRefund === true &&
    UUID_PATTERN.test(order.publicId || "") &&
    Number.isSafeInteger(order.refundableAmount) &&
    order.refundableAmount > 0
  );
}

export function buildAdminRefundRequest({
  orderPublicId,
  amount,
  reason,
  idempotencyKey,
  csrfToken
}) {
  if (!UUID_PATTERN.test(orderPublicId || "")) {
    throw new Error("Invalid order identifier");
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Invalid refund amount");
  }
  if (!REFUND_REASONS.has(reason)) {
    throw new Error("Invalid refund reason");
  }
  if (!UUID_V4_PATTERN.test(idempotencyKey || "")) {
    throw new Error("Invalid refund idempotency key");
  }
  if (typeof csrfToken !== "string" || csrfToken.length === 0) {
    throw new Error("Invalid CSRF token");
  }

  return {
    url: `/api/v1/admin/orders/${encodeURIComponent(orderPublicId)}/refunds`,
    options: {
      method: "POST",
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken,
        "idempotency-key": idempotencyKey.toLowerCase()
      },
      body: {
        amount,
        reason
      }
    }
  };
}

export function refundOperationErrorMessage(error) {
  const code = error?.data?.code;
  const messages = {
    RECENT_AUTHENTICATION_REQUIRED:
      "Reconnectez-vous avant d'effectuer ce remboursement. L'authentification admin doit dater de moins de dix minutes.",
    REFUND_FORBIDDEN: "Votre compte ne dispose pas du droit d'effectuer un remboursement.",
    CSRF_VALIDATION_FAILED:
      "La vérification de sécurité a expiré. Rechargez la page puis réessayez.",
    ORDER_NOT_REFUNDABLE: "Cette commande n'est plus remboursable.",
    PAYMENT_NOT_REFUNDABLE: "Aucun paiement remboursable n'est disponible pour cette commande.",
    REFUND_AMOUNT_EXCEEDS_BALANCE:
      "Le montant dépasse le solde remboursable. Actualisez la commande avant de réessayer.",
    IDEMPOTENCY_KEY_REUSED:
      "Cette tentative de remboursement ne correspond plus à la demande initiale. Actualisez la commande.",
    REFUND_PROVIDER_PENDING:
      "Stripe n'a pas confirmé le résultat. Réessayez sans modifier le montant ni le motif afin de réutiliser la même demande."
  };

  if (messages[code]) {
    return messages[code];
  }
  if (error?.statusCode === 429) {
    return "Trop de remboursements ont été demandés. Réessayez dans quelques instants.";
  }

  return "Le remboursement n'a pas pu être demandé. Vérifiez l'état de la commande avant de réessayer.";
}
