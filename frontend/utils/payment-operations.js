function action(type, id, label) {
  return { type, id, label };
}

function link(route, label) {
  return { route, label };
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format((amount || 0) / 100);
}

export function buildPaymentAnomalyRows(payload = {}) {
  const refunds = (payload.refunds || []).map((refund) => ({
    key: `refund:${refund.id}`,
    category: "Refund",
    title: `${formatMoney(refund.amount, refund.currency)} pending`,
    status: refund.status,
    reference: refund.id,
    orderId: refund.orderId,
    detail: [
      refund.reasonCode,
      refund.paymentId ? `Payment #${refund.paymentId}` : "",
      refund.paymentStatus ? `payment status ${refund.paymentStatus}` : "",
      refund.providerStatus || "Stripe confirmation pending",
      refund.requestedBy ? `requested by ${refund.requestedBy}` : ""
    ]
      .filter(Boolean)
      .join(" - "),
    occurredAt: refund.createdAt,
    action: null,
    link: refund.paymentId
      ? link(`/admin/payments/${encodeURIComponent(String(refund.paymentId))}`, "Open payment")
      : refund.orderId
        ? link(`/admin/orders/${encodeURIComponent(String(refund.orderId))}`, "Open order")
        : null
  }));

  const webhooks = (payload.webhooks || []).map((webhook) => ({
    key: `webhook:${webhook.id}`,
    category: "Webhook Stripe",
    title: webhook.eventType,
    status: webhook.status,
    reference: webhook.eventId,
    orderId: webhook.orderId,
    detail: webhook.errorCode || `${webhook.attemptCount || 0} attempt(s)`,
    occurredAt: webhook.createdAt,
    action: webhook.replayable ? action("webhook", webhook.eventId, "Replay from Stripe") : null,
    link: webhook.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(webhook.orderId))}`, "Open order")
      : null
  }));

  const tasks = (payload.tasks || []).map((task) => ({
    key: `task:${task.id}`,
    category: "Finalization",
    title: task.taskType,
    status: task.status,
    reference: `Task #${task.id}`,
    orderId: task.orderId,
    detail: task.errorCode || `${task.attemptCount || 0} attempt(s)`,
    occurredAt: task.lockedAt || task.availableAt,
    action: task.replayable ? action("task", task.id, "Requeue task") : null,
    link: task.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(task.orderId))}`, "Open order")
      : null
  }));

  const orders = (payload.orders || []).map((order) => ({
    key: `order:${order.id}`,
    category: "Order",
    title: order.status,
    status: order.paymentStatus || "UNKNOWN",
    reference: order.id,
    orderId: order.id,
    detail: order.providerStatus || "Stripe status unavailable",
    occurredAt: order.updatedAt,
    action: order.reconcileable ? action("order", order.id, "Reconcile with Stripe") : null,
    link: link(`/admin/orders/${encodeURIComponent(String(order.id))}`, "Open order")
  }));

  const alerts = (payload.alerts || []).map((alert) => ({
    key: `alert:${alert.id}`,
    category: "Operator alert",
    title: alert.code,
    status: alert.status,
    reference: `Alert #${alert.id}`,
    orderId: alert.orderId,
    detail: `${alert.orderStatus} / ${alert.paymentStatus || "UNKNOWN"}`,
    occurredAt: alert.createdAt,
    action: action("alert", alert.id, "Mark resolved"),
    link: alert.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(alert.orderId))}`, "Open order")
      : null
  }));

  const disputes = (payload.disputes || []).map((dispute) => ({
    key: `dispute:${dispute.id}`,
    category: "Stripe dispute",
    title: `${dispute.reason} - ${dispute.amount} ${dispute.currency}`,
    status: dispute.status,
    reference: dispute.id,
    orderId: dispute.orderId,
    detail: [
      dispute.evidenceDueAt
        ? `Evidence due by ${new Intl.DateTimeFormat("en-US").format(new Date(dispute.evidenceDueAt))}`
        : "No evidence due date provided",
      dispute.evidence
        ? `${dispute.evidence.submissionCount} submission(s), ${dispute.evidence.fileReferenceCount} Stripe file(s)`
        : "Evidence audit not synced"
    ].join(" - "),
    occurredAt: dispute.createdAt,
    action: action("dispute", dispute.id, "Sync evidence"),
    link: dispute.orderId
      ? link(`/admin/orders/${encodeURIComponent(String(dispute.orderId))}`, "Open order")
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
    return "Sign in again before performing a sensitive financial action.";
  }
  if (code === "PAYMENT_STATE_STILL_INCOHERENT") {
    return "Reconcile the order with Stripe before resolving the alert.";
  }
  if (error?.statusCode === 429) {
    return "Too many actions were requested. Try again in a moment.";
  }
  return error?.data?.message || "The payment action failed.";
}
