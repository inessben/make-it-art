function action(type, id, label) {
  return { type, id, label };
}

function link(route, label) {
  return { route, label };
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format((amount || 0) / 100);
}

export function buildPaymentAnomalyRows(payload = {}) {
  const refunds = (payload.refunds || []).map((refund) => ({
    key: `refund:${refund.id}`,
    category: "Remboursement",
    title: `${formatMoney(refund.amount, refund.currency)} en attente`,
    status: refund.status,
    reference: refund.id,
    orderId: refund.orderId,
    detail: [
      refund.reasonCode,
      refund.paymentId ? `Paiement #${refund.paymentId}` : "",
      refund.paymentStatus ? `statut paiement ${refund.paymentStatus}` : "",
      refund.providerStatus || "confirmation Stripe en attente",
      refund.requestedBy ? `demande par ${refund.requestedBy}` : ""
    ]
      .filter(Boolean)
      .join(" · "),
    occurredAt: refund.createdAt,
    action: null,
    link: refund.paymentId
      ? link(
          `/admin/payments/${encodeURIComponent(String(refund.paymentId))}`,
          "Ouvrir le paiement"
        )
      : refund.orderId
        ? link(`/admin/orders/${encodeURIComponent(String(refund.orderId))}`, "Ouvrir la commande")
        : null
  }));

  const webhooks = (payload.webhooks || []).map((webhook) => ({
    key: `webhook:${webhook.id}`,
    category: "Webhook Stripe",
    title: webhook.eventType,
    status: webhook.status,
    reference: webhook.eventId,
    orderId: webhook.orderId,
    detail: webhook.errorCode || `${webhook.attemptCount || 0} tentative(s)`,
    occurredAt: webhook.createdAt,
    action: webhook.replayable ? action("webhook", webhook.eventId, "Rejouer depuis Stripe") : null,
    link: webhook.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(webhook.orderId))}`, "Ouvrir la commande")
      : null
  }));

  const tasks = (payload.tasks || []).map((task) => ({
    key: `task:${task.id}`,
    category: "Finalisation",
    title: task.taskType,
    status: task.status,
    reference: `Task #${task.id}`,
    orderId: task.orderId,
    detail: task.errorCode || `${task.attemptCount || 0} tentative(s)`,
    occurredAt: task.lockedAt || task.availableAt,
    action: task.replayable ? action("task", task.id, "Remettre en file") : null,
    link: task.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(task.orderId))}`, "Ouvrir la commande")
      : null
  }));

  const orders = (payload.orders || []).map((order) => ({
    key: `order:${order.id}`,
    category: "Commande",
    title: order.status,
    status: order.paymentStatus || "UNKNOWN",
    reference: order.id,
    orderId: order.id,
    detail: order.providerStatus || "Statut Stripe non disponible",
    occurredAt: order.updatedAt,
    action: order.reconcileable ? action("order", order.id, "Rapprocher avec Stripe") : null,
    link: link(`/admin/orders/${encodeURIComponent(String(order.id))}`, "Ouvrir la commande")
  }));

  const alerts = (payload.alerts || []).map((alert) => ({
    key: `alert:${alert.id}`,
    category: "Alerte operateur",
    title: alert.code,
    status: alert.status,
    reference: `Alert #${alert.id}`,
    orderId: alert.orderId,
    detail: `${alert.orderStatus} / ${alert.paymentStatus || "UNKNOWN"}`,
    occurredAt: alert.createdAt,
    action: action("alert", alert.id, "Marquer resolue"),
    link: alert.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(alert.orderId))}`, "Ouvrir la commande")
      : null
  }));

  const disputes = (payload.disputes || []).map((dispute) => ({
    key: `dispute:${dispute.id}`,
    category: "Litige Stripe",
    title: `${dispute.reason} · ${dispute.amount} ${dispute.currency}`,
    status: dispute.status,
    reference: dispute.id,
    orderId: dispute.orderId,
    detail: [
      dispute.evidenceDueAt
        ? `Preuves attendues avant ${new Intl.DateTimeFormat("fr-FR").format(new Date(dispute.evidenceDueAt))}`
        : "Aucune echeance de preuve fournie",
      dispute.evidence
        ? `${dispute.evidence.submissionCount} soumission(s), ${dispute.evidence.fileReferenceCount} fichier(s) Stripe`
        : "Audit de preuves non synchronise"
    ].join(" · "),
    occurredAt: dispute.createdAt,
    action: action("dispute", dispute.id, "Synchroniser les preuves"),
    link: dispute.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(dispute.orderId))}`, "Ouvrir la commande")
      : null
  }));

  return [...disputes, ...refunds, ...webhooks, ...tasks, ...orders, ...alerts];
}

export function buildPaymentOperationRequest(operation) {
  if (!operation || operation.id === undefined || operation.id === null) {
    throw new Error("Invalid payment operation");
  }

  const id = encodeURIComponent(String(operation.id));
  const routes = {
    task: `/api/v1/admin/payments/anomalies/tasks/${id}/replay`,
    webhook: `/api/v1/admin/payments/anomalies/webhooks/${id}/replay`,
    order: `/api/v1/admin/payments/anomalies/orders/${id}/reconcile`,
    alert: `/api/v1/admin/payments/anomalies/alerts/${id}/resolve`,
    dispute: `/api/v1/admin/payments/anomalies/disputes/${id}/sync-evidence`
  };
  const url = routes[operation.type];
  if (!url) {
    throw new Error("Unsupported payment operation");
  }

  return {
    url,
    body: operation.type === "alert" ? { resolutionCode: "RECONCILED" } : {}
  };
}

export function paymentOperationErrorMessage(error) {
  const code = error?.data?.code;
  if (code === "RECENT_AUTHENTICATION_REQUIRED") {
    return "Reconnectez-vous avant d'effectuer une action financiere sensible.";
  }
  if (code === "PAYMENT_STATE_STILL_INCOHERENT") {
    return "Rapprochez d'abord la commande avec Stripe avant de resoudre l'alerte.";
  }
  if (error?.statusCode === 429) {
    return "Trop d'actions ont ete demandees. Reessayez dans quelques instants.";
  }
  return error?.data?.message || "L'action de paiement a echoue.";
}
