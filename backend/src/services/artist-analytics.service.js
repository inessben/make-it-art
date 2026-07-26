const orderRepository = require("../repositories/order.repository");
const notificationRepository = require("../repositories/notification.repository");
const {
  formatCurrencyAmount,
  buildOrderStatus,
  buildPaymentStatus,
  formatOrderReference,
  getOrderAmountValue,
  getOrderItemGrossAmountValue,
  getOrderItemNetAmountValue,
  getOrderItemCommissionAmountValue,
  getRefundBreakdown
} = require("../utils/commerce");

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function monthKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric"
  });
}

function buildLastMonths(count = 6) {
  const months = [];
  const cursor = startOfMonth(new Date());

  for (let index = 0; index < count; index += 1) {
    months.unshift(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return months;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function isConfirmedSaleStatus(status) {
  return ["Paid", "Partially refunded", "Refunded"].includes(status);
}

function isPendingSaleStatus(status) {
  return ["Pending", "Processing", "Under review"].includes(status);
}

function mapSettlementStatus({
  saleStatus,
  refundedAmountValue,
  pendingRefundAmountValue,
  grossAmountValue
}) {
  if (refundedAmountValue >= grossAmountValue - 0.01 && grossAmountValue > 0) {
    return "Refunded";
  }

  if (pendingRefundAmountValue > 0) {
    return "Refund pending";
  }

  if (refundedAmountValue > 0) {
    return "Partially refunded";
  }

  if (saleStatus === "Paid") {
    return "Available";
  }

  if (saleStatus === "Under review") {
    return "Under review";
  }

  if (saleStatus === "Failed") {
    return "Failed";
  }

  if (saleStatus === "Canceled") {
    return "Canceled";
  }

  return "Pending";
}

function serializeNotification(notification) {
  return {
    id: notification.id,
    type: notification.type || "system",
    title: notification.title || "Notification",
    message: notification.message || "",
    payload: notification.payload || null,
    read: Boolean(notification.readAt),
    readAt: notification.readAt,
    createdAt: notification.createdAt
  };
}

function buildSaleFinancials(orderItem) {
  const order = orderItem.order || {};
  const grossAmountValue = getOrderItemGrossAmountValue(orderItem);
  const preCommissionAmountValue = getOrderItemNetAmountValue(orderItem, grossAmountValue);
  const commissionAmountValue = getOrderItemCommissionAmountValue(
    orderItem,
    preCommissionAmountValue
  );
  const artistEarningsValue = roundCurrency(
    Math.max(preCommissionAmountValue - commissionAmountValue, 0)
  );

  const orderGrossAmountValue = getOrderAmountValue(order);
  const refundBreakdown = getRefundBreakdown(order);
  const share =
    orderGrossAmountValue > 0 ? Math.min(grossAmountValue / orderGrossAmountValue, 1) : 0;
  const refundedAmountValue = roundCurrency(refundBreakdown.refundedAmount * share);
  const pendingRefundAmountValue = roundCurrency(refundBreakdown.pendingRefundAmount * share);
  const refundedEarningsValue =
    grossAmountValue > 0
      ? roundCurrency(artistEarningsValue * Math.min(refundedAmountValue / grossAmountValue, 1))
      : 0;
  const availableEarningsValue = roundCurrency(
    Math.max(artistEarningsValue - refundedEarningsValue, 0)
  );

  return {
    grossAmountValue,
    preCommissionAmountValue,
    commissionAmountValue,
    artistEarningsValue,
    refundedAmountValue,
    pendingRefundAmountValue,
    refundedEarningsValue,
    availableEarningsValue
  };
}

function serializeSaleRow(orderItem) {
  const order = orderItem.order || {};
  const saleStatus = buildOrderStatus(order);
  const paymentStatus = buildPaymentStatus(order.payments?.[0]);
  const financials = buildSaleFinancials(orderItem);
  const settlementStatus = mapSettlementStatus({
    saleStatus,
    refundedAmountValue: financials.refundedAmountValue,
    pendingRefundAmountValue: financials.pendingRefundAmountValue,
    grossAmountValue: financials.grossAmountValue
  });
  const availableEarningsValue = ["Available", "Partially refunded", "Refund pending"].includes(
    settlementStatus
  )
    ? financials.availableEarningsValue
    : 0;

  return {
    id: orderItem.id,
    orderId: order.id,
    orderPublicId: order.publicId || null,
    reference: formatOrderReference(order.id),
    artworkId: orderItem.artworkId,
    artworkTitle: orderItem.artwork?.title || orderItem.artworkTitle || "Oeuvre",
    buyer: order.user?.username || order.user?.email || "Collectionneur",
    buyerEmail: order.user?.email || "",
    status: saleStatus,
    paymentStatus,
    settlementStatus,
    amountValue: financials.grossAmountValue,
    amount: formatCurrencyAmount(financials.grossAmountValue),
    preCommissionAmountValue: financials.preCommissionAmountValue,
    preCommissionAmount: formatCurrencyAmount(financials.preCommissionAmountValue),
    commissionAmountValue: financials.commissionAmountValue,
    commissionAmount: formatCurrencyAmount(financials.commissionAmountValue),
    artistEarningsValue: financials.artistEarningsValue,
    artistEarnings: formatCurrencyAmount(financials.artistEarningsValue),
    availableEarningsValue,
    availableEarnings: formatCurrencyAmount(availableEarningsValue),
    refundedAmountValue: financials.refundedAmountValue,
    refundedAmount: formatCurrencyAmount(financials.refundedAmountValue),
    refundedEarningsValue: financials.refundedEarningsValue,
    refundedEarnings: formatCurrencyAmount(financials.refundedEarningsValue),
    pendingRefundAmountValue: financials.pendingRefundAmountValue,
    pendingRefundAmount: formatCurrencyAmount(financials.pendingRefundAmountValue),
    createdAt: order.createdAt || orderItem.createdAt
  };
}

function buildStatusBreakdown(sales) {
  const summary = new Map();

  for (const sale of sales) {
    const count = summary.get(sale.settlementStatus) || 0;
    summary.set(sale.settlementStatus, count + 1);
  }

  return [...summary.entries()].map(([status, count]) => ({
    status,
    count
  }));
}

function sumSales(sales, field) {
  return roundCurrency(sales.reduce((total, sale) => total + Number(sale[field] || 0), 0));
}

function buildFinanceSummary(sales) {
  const confirmedSales = sales.filter((sale) => isConfirmedSaleStatus(sale.status));
  const pendingSales = sales.filter((sale) => isPendingSaleStatus(sale.status));

  const grossRevenueValue = sumSales(confirmedSales, "amountValue");
  const preCommissionRevenueValue = sumSales(confirmedSales, "preCommissionAmountValue");
  const totalCommissionValue = sumSales(confirmedSales, "commissionAmountValue");
  const artistEarningsValue = sumSales(confirmedSales, "artistEarningsValue");
  const availableBalanceValue = sumSales(sales, "availableEarningsValue");
  const pendingBalanceValue = sumSales(pendingSales, "artistEarningsValue");
  const refundedAmountValue = sumSales(sales, "refundedAmountValue");
  const refundedEarningsValue = sumSales(sales, "refundedEarningsValue");

  return {
    paidSalesCount: confirmedSales.length,
    pendingSalesCount: pendingSales.length,
    refundCount: sales.filter((sale) => sale.refundedAmountValue > 0).length,
    grossRevenueValue,
    grossRevenue: formatCurrencyAmount(grossRevenueValue),
    preCommissionRevenueValue,
    preCommissionRevenue: formatCurrencyAmount(preCommissionRevenueValue),
    totalCommissionValue,
    totalCommission: formatCurrencyAmount(totalCommissionValue),
    artistEarningsValue,
    artistEarnings: formatCurrencyAmount(artistEarningsValue),
    availableBalanceValue,
    availableBalance: formatCurrencyAmount(availableBalanceValue),
    pendingBalanceValue,
    pendingBalance: formatCurrencyAmount(pendingBalanceValue),
    refundedAmountValue,
    refundedAmount: formatCurrencyAmount(refundedAmountValue),
    refundedEarningsValue,
    refundedEarnings: formatCurrencyAmount(refundedEarningsValue),
    statusBreakdown: buildStatusBreakdown(sales),
    commissionRate: "7% HT",
    withdrawalMode: "Manual settlement",
    withdrawalNote:
      "Les retraits automatiques ne sont pas encore connectes. Utilisez ce solde disponible pour vos rapprochements manuels."
  };
}

async function loadArtistNotifications(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      unreadCount: 0,
      items: []
    };
  }

  const [notifications, unreadCount] = await Promise.all([
    notificationRepository.listNotificationsForUser(userId, {
      limit: 5
    }),
    notificationRepository.countUnreadForUser(userId)
  ]);

  return {
    unreadCount,
    items: notifications.map(serializeNotification)
  };
}

async function buildArtistSalesPayload(artistId) {
  const orderItems = await orderRepository.listOrderItemsForArtist(artistId);
  const sales = orderItems.map(serializeSaleRow);
  const finance = buildFinanceSummary(sales);

  return {
    summary: {
      totalSales: finance.paidSalesCount,
      grossRevenue: finance.grossRevenue,
      grossRevenueValue: finance.grossRevenueValue,
      artistEarnings: finance.artistEarnings,
      artistEarningsValue: finance.artistEarningsValue,
      availableBalance: finance.availableBalance,
      availableBalanceValue: finance.availableBalanceValue,
      pendingBalance: finance.pendingBalance,
      pendingBalanceValue: finance.pendingBalanceValue,
      totalCommission: finance.totalCommission,
      totalCommissionValue: finance.totalCommissionValue,
      refundedAmount: finance.refundedAmount,
      refundedAmountValue: finance.refundedAmountValue,
      pendingSales: finance.pendingSalesCount,
      refunds: finance.refundCount,
      commissionRate: finance.commissionRate,
      statusBreakdown: finance.statusBreakdown
    },
    sales
  };
}

async function buildArtistDashboardPayload(artistId, artistStats = {}) {
  const orderItems = await orderRepository.listOrderItemsForArtist(artistId);
  const sales = orderItems.map(serializeSaleRow);
  const finance = buildFinanceSummary(sales);
  const notifications = await loadArtistNotifications(artistStats.userId);
  const confirmedSales = sales.filter((sale) => isConfirmedSaleStatus(sale.status));

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const previousMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const salesToday = confirmedSales.filter(
    (sale) => sale.createdAt && new Date(sale.createdAt) >= todayStart
  );
  const salesThisMonth = confirmedSales.filter(
    (sale) => sale.createdAt && new Date(sale.createdAt) >= monthStart
  );
  const salesPreviousMonth = confirmedSales.filter((sale) => {
    if (!sale.createdAt) {
      return false;
    }

    const createdAt = new Date(sale.createdAt);
    return createdAt >= previousMonthStart && createdAt < monthStart;
  });

  const artistEarningsThisMonthValue = sumSales(salesThisMonth, "availableEarningsValue");
  const artistEarningsPreviousMonthValue = sumSales(salesPreviousMonth, "availableEarningsValue");
  const revenueGrowthPercent =
    artistEarningsPreviousMonthValue > 0
      ? Math.round(
          ((artistEarningsThisMonthValue - artistEarningsPreviousMonthValue) /
            artistEarningsPreviousMonthValue) *
            100
        )
      : artistEarningsThisMonthValue > 0
        ? 100
        : 0;

  const avgSaleValue =
    confirmedSales.length > 0 ? finance.grossRevenueValue / confirmedSales.length : 0;

  const favoritesTotal = Number(artistStats.favorites || 0);
  const conversionRate =
    favoritesTotal > 0 ? Math.round((confirmedSales.length / favoritesTotal) * 1000) / 10 : 0;

  const monthBuckets = buildLastMonths(6).map((key) => ({
    key,
    label: monthLabel(key),
    salesCount: 0,
    grossRevenueValue: 0,
    commissionAmountValue: 0,
    artistEarningsValue: 0,
    availableEarningsValue: 0
  }));
  const monthIndex = new Map(monthBuckets.map((bucket, index) => [bucket.key, index]));

  for (const sale of confirmedSales) {
    if (!sale.createdAt) {
      continue;
    }

    const key = monthKey(sale.createdAt);
    const index = monthIndex.get(key);

    if (index === undefined) {
      continue;
    }

    monthBuckets[index].salesCount += 1;
    monthBuckets[index].grossRevenueValue += sale.amountValue;
    monthBuckets[index].commissionAmountValue += sale.commissionAmountValue;
    monthBuckets[index].artistEarningsValue += sale.artistEarningsValue;
    monthBuckets[index].availableEarningsValue += sale.availableEarningsValue;
  }

  const artworkPerformance = new Map();

  for (const sale of confirmedSales) {
    const artworkId = sale.artworkId;
    const existing = artworkPerformance.get(artworkId) || {
      artworkId,
      title: sale.artworkTitle || "Oeuvre",
      salesCount: 0,
      grossRevenueValue: 0,
      artistEarningsValue: 0
    };

    existing.salesCount += 1;
    existing.grossRevenueValue += sale.amountValue;
    existing.artistEarningsValue += sale.availableEarningsValue;
    artworkPerformance.set(artworkId, existing);
  }

  const topArtworks = [...artworkPerformance.values()]
    .sort((left, right) => {
      if (right.artistEarningsValue !== left.artistEarningsValue) {
        return right.artistEarningsValue - left.artistEarningsValue;
      }

      if (right.salesCount !== left.salesCount) {
        return right.salesCount - left.salesCount;
      }

      return right.grossRevenueValue - left.grossRevenueValue;
    })
    .slice(0, 5)
    .map((entry) => ({
      artworkId: entry.artworkId,
      title: entry.title,
      salesCount: entry.salesCount,
      grossRevenueValue: roundCurrency(entry.grossRevenueValue),
      grossRevenue: formatCurrencyAmount(roundCurrency(entry.grossRevenueValue)),
      artistEarningsValue: roundCurrency(entry.artistEarningsValue),
      artistEarnings: formatCurrencyAmount(roundCurrency(entry.artistEarningsValue))
    }));

  return {
    stats: [
      {
        label: "Ventes confirmees",
        value: finance.paidSalesCount,
        description: "Nombre total de ventes confirmees sur votre catalogue."
      },
      {
        label: "CA brut",
        value: finance.grossRevenue,
        description: "Montant total encaisse avant commission plateforme."
      },
      {
        label: "Gains artiste",
        value: finance.artistEarnings,
        description: "Gains estimes apres TVA metier et commission plateforme."
      },
      {
        label: "Solde disponible",
        value: finance.availableBalance,
        description: "Part actuellement disponible pour votre suivi de versement."
      },
      {
        label: "Solde en attente",
        value: finance.pendingBalance,
        description: "Ventes encore en attente de confirmation ou de revue."
      },
      {
        label: "Commission plateforme",
        value: finance.totalCommission,
        description: "Commission cumulee sur vos ventes confirmees."
      }
    ],
    performance: {
      salesThisMonth: salesThisMonth.length,
      salesToday: salesToday.length,
      avgSaleValue: formatCurrencyAmount(roundCurrency(avgSaleValue)),
      avgSaleValueRaw: roundCurrency(avgSaleValue),
      revenueGrowthPercent,
      conversionRate,
      favoritesTotal,
      followersTotal: Number(artistStats.followers || 0),
      artworksTotal: Number(artistStats.artworks || 0),
      refundCount: finance.refundCount
    },
    finance,
    analytics: {
      salesByMonth: monthBuckets.map((bucket) => ({
        label: bucket.label,
        salesCount: bucket.salesCount,
        grossRevenueValue: roundCurrency(bucket.grossRevenueValue),
        grossRevenue: formatCurrencyAmount(roundCurrency(bucket.grossRevenueValue)),
        commissionAmountValue: roundCurrency(bucket.commissionAmountValue),
        commissionAmount: formatCurrencyAmount(roundCurrency(bucket.commissionAmountValue)),
        artistEarningsValue: roundCurrency(bucket.artistEarningsValue),
        artistEarnings: formatCurrencyAmount(roundCurrency(bucket.artistEarningsValue)),
        availableEarningsValue: roundCurrency(bucket.availableEarningsValue),
        availableEarnings: formatCurrencyAmount(roundCurrency(bucket.availableEarningsValue))
      })),
      topArtworks,
      statusBreakdown: finance.statusBreakdown
    },
    notifications,
    recentSales: sales.slice(0, 8)
  };
}

module.exports = {
  buildArtistDashboardPayload,
  buildArtistSalesPayload
};
