function action(type, id, label) {
  return { type, id, label };
}

export function buildPaymentAnomalyRows(payload = {}) {
  const webhooks = (payload.webhooks || []).map((webhook) => ({
    key: `webhook:${webhook.id}`,
    category: "Webhook Stripe",
    title: webhook.eventType,
    status: webhook.status,
    reference: webhook.eventId,
    orderId: webhook.orderId,
    detail: webhook.errorCode || `${webhook.attemptCount || 0} tentative(s)`,
    occurredAt: webhook.createdAt,
    action: webhook.replayable ? action("webhook", webhook.eventId, "Rejouer depuis Stripe") : null
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
    action: task.replayable ? action("task", task.id, "Remettre en file") : null
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
    action: order.reconcileable ? action("order", order.id, "Rapprocher avec Stripe") : null
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
    action: action("alert", alert.id, "Marquer resolue")
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
    action: action("dispute", dispute.id, "Synchroniser les preuves")
  }));

  return [...disputes, ...webhooks, ...tasks, ...orders, ...alerts];
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
