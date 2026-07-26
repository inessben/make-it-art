const orderRepository = require("../repositories/order.repository");
const {
  parseAmount,
  formatCurrencyAmount,
  buildOrderStatus,
  isPaidOrder,
  computeNetRevenue,
  formatOrderReference,
  ARTIST_NET_REVENUE_RATE
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

function serializeSaleRow(orderItem) {
  const order = orderItem.order;
  const amountValue = parseAmount(orderItem.priceTokens);
  const status = buildOrderStatus(order);

  return {
    id: orderItem.id,
    orderId: order.id,
    reference: formatOrderReference(order.id),
    artworkId: orderItem.artworkId,
    artworkTitle: orderItem.artwork?.title || "Oeuvre",
    buyer: order.user?.username || order.user?.email || "Collectionneur",
    buyerEmail: order.user?.email || "",
    status,
    amountValue,
    amount: formatCurrencyAmount(amountValue),
    netAmountValue: computeNetRevenue(amountValue),
    netAmount: formatCurrencyAmount(computeNetRevenue(amountValue)),
    createdAt: order.createdAt
  };
}

async function buildArtistSalesPayload(artistId) {
  const orderItems = await orderRepository.listOrderItemsForArtist(artistId);
  const sales = orderItems.map(serializeSaleRow);
  const paidSales = sales.filter((sale) => sale.status === "Paid");
  const grossRevenue = paidSales.reduce((sum, sale) => sum + sale.amountValue, 0);

  return {
    summary: {
      totalSales: paidSales.length,
      grossRevenue: formatCurrencyAmount(grossRevenue),
      grossRevenueValue: grossRevenue,
      netRevenue: formatCurrencyAmount(computeNetRevenue(grossRevenue)),
      netRevenueValue: computeNetRevenue(grossRevenue),
      pendingSales: sales.filter((sale) => sale.status === "Pending").length,
      commissionRate: `${Math.round((1 - ARTIST_NET_REVENUE_RATE) * 100)}%`
    },
    sales
  };
}

async function buildArtistDashboardPayload(artistId, artistStats = {}) {
  const orderItems = await orderRepository.listOrderItemsForArtist(artistId);
  const sales = orderItems.map(serializeSaleRow);
  const paidSales = sales.filter((sale) => sale.status === "Paid");

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const previousMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const salesToday = paidSales.filter(
    (sale) => sale.createdAt && new Date(sale.createdAt) >= todayStart
  );
  const salesThisMonth = paidSales.filter(
    (sale) => sale.createdAt && new Date(sale.createdAt) >= monthStart
  );
  const salesPreviousMonth = paidSales.filter((sale) => {
    if (!sale.createdAt) {
      return false;
    }

    const createdAt = new Date(sale.createdAt);
    return createdAt >= previousMonthStart && createdAt < monthStart;
  });

  const grossRevenue = paidSales.reduce((sum, sale) => sum + sale.amountValue, 0);
  const grossRevenueThisMonth = salesThisMonth.reduce((sum, sale) => sum + sale.amountValue, 0);
  const grossRevenuePreviousMonth = salesPreviousMonth.reduce(
    (sum, sale) => sum + sale.amountValue,
    0
  );

  const revenueGrowthPercent =
    grossRevenuePreviousMonth > 0
      ? Math.round(
          ((grossRevenueThisMonth - grossRevenuePreviousMonth) / grossRevenuePreviousMonth) * 100
        )
      : grossRevenueThisMonth > 0
        ? 100
        : 0;

  const avgSaleValue = paidSales.length > 0 ? grossRevenue / paidSales.length : 0;

  const favoritesTotal = Number(artistStats.favorites || 0);
  const conversionRate =
    favoritesTotal > 0 ? Math.round((paidSales.length / favoritesTotal) * 1000) / 10 : 0;

  const monthBuckets = buildLastMonths(6).map((key) => ({
    key,
    label: monthLabel(key),
    salesCount: 0,
    grossRevenue: 0,
    netRevenue: 0
  }));
  const monthIndex = new Map(monthBuckets.map((bucket, index) => [bucket.key, index]));

  for (const sale of paidSales) {
    if (!sale.createdAt) {
      continue;
    }

    const key = monthKey(sale.createdAt);
    const index = monthIndex.get(key);

    if (index === undefined) {
      continue;
    }

    monthBuckets[index].salesCount += 1;
    monthBuckets[index].grossRevenue += sale.amountValue;
    monthBuckets[index].netRevenue += computeNetRevenue(sale.amountValue);
  }

  const artworkPerformance = new Map();

  for (const orderItem of orderItems) {
    if (!isPaidOrder(orderItem.order)) {
      continue;
    }

    const artworkId = orderItem.artworkId;
    const existing = artworkPerformance.get(artworkId) || {
      artworkId,
      title: orderItem.artwork?.title || "Oeuvre",
      salesCount: 0,
      grossRevenue: 0
    };

    const amountValue = parseAmount(orderItem.priceTokens);
    existing.salesCount += 1;
    existing.grossRevenue += amountValue;
    artworkPerformance.set(artworkId, existing);
  }

  const topArtworks = [...artworkPerformance.values()]
    .sort((left, right) => {
      if (right.salesCount !== left.salesCount) {
        return right.salesCount - left.salesCount;
      }

      return right.grossRevenue - left.grossRevenue;
    })
    .slice(0, 5)
    .map((entry) => ({
      artworkId: entry.artworkId,
      title: entry.title,
      salesCount: entry.salesCount,
      grossRevenue: formatCurrencyAmount(entry.grossRevenue),
      grossRevenueValue: entry.grossRevenue
    }));

  return {
    stats: [
      {
        label: "Ventes",
        value: paidSales.length,
        description: "Nombre total de ventes confirmees."
      },
      {
        label: "Revenus bruts",
        value: formatCurrencyAmount(grossRevenue),
        description: "Montant total des ventes avant commission."
      },
      {
        label: "Revenus nets",
        value: formatCurrencyAmount(computeNetRevenue(grossRevenue)),
        description: `Part artiste apres commission plateforme (${Math.round((1 - ARTIST_NET_REVENUE_RATE) * 100)}%).`
      },
      {
        label: "Ventes du jour",
        value: salesToday.length,
        description: "Transactions payees aujourd'hui."
      }
    ],
    performance: {
      salesThisMonth: salesThisMonth.length,
      salesToday: salesToday.length,
      avgSaleValue: formatCurrencyAmount(avgSaleValue),
      avgSaleValueRaw: avgSaleValue,
      revenueGrowthPercent,
      conversionRate,
      favoritesTotal,
      followersTotal: Number(artistStats.followers || 0),
      artworksTotal: Number(artistStats.artworks || 0)
    },
    analytics: {
      salesByMonth: monthBuckets.map((bucket) => ({
        label: bucket.label,
        salesCount: bucket.salesCount,
        grossRevenue: formatCurrencyAmount(bucket.grossRevenue),
        grossRevenueValue: bucket.grossRevenue,
        netRevenue: formatCurrencyAmount(bucket.netRevenue),
        netRevenueValue: bucket.netRevenue
      })),
      topArtworks
    },
    recentSales: paidSales.slice(0, 8)
  };
}

module.exports = {
  buildArtistDashboardPayload,
  buildArtistSalesPayload
};
