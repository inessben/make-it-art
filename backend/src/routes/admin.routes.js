const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { adminRequired, isAdminUser } = require("../middlewares/admin-required.middleware");
const userRepository = require("../repositories/user.repository");
const artistRepository = require("../repositories/artist.repository");
const artworkRepository = require("../repositories/artwork.repository");
const orderRepository = require("../repositories/order.repository");
const paymentRepository = require("../repositories/payment.repository");

const router = express.Router();

function buildUserRole(user) {
  if (isAdminUser(user)) {
    return "Admin";
  }

  if (user.artist) {
    return "Artist";
  }

  if (user.role) {
    return user.role;
  }

  return "Collector";
}

function buildUserStatus(user) {
  if (!user.verified) {
    return "Pending verification";
  }

  if (!user.isActive) {
    return "Inactive";
  }

  return "Active";
}

function buildArtworkStatus(artwork) {
  if (!artwork.category) {
    return "Needs category";
  }

  if (artwork.protection) {
    return "Protected";
  }

  return "Published";
}

function buildOrderStatus(order) {
  if (order.status) {
    return order.status;
  }

  if (order.payments.some((payment) => payment.status === "Succeeded")) {
    return "Paid";
  }

  if (order.payments.some((payment) => payment.status === "Refunded")) {
    return "Refunded";
  }

  return "Pending";
}

function buildPaymentStatus(payment) {
  if (payment.status) {
    return payment.status;
  }

  return "Pending";
}

function parseAmount(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = String(value)
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrencyAmount(value) {
  return `EUR ${value.toFixed(2)}`;
}

function serializeAdminArtist(artist) {
  return {
    id: artist.id,
    userId: artist.userId,
    name: artist.displayName || artist.user?.username || "Artiste sans nom",
    email: artist.user?.email || "Email non renseigne",
    bio: artist.user?.bio || "Aucune bio pour le moment.",
    verified: Boolean(artist.verified),
    isActive: Boolean(artist.user?.isActive),
    isAdmin: isAdminUser(artist.user),
    artworksCount: artist._count.artworks,
    followersCount: artist._count.followers,
    collectionsCount: artist._count.collections,
    createdAt: artist.createdAt || artist.user?.createdAt || null
  };
}

router.get("/admin/users", authRequired, adminRequired, async (_req, res) => {
  try {
    const users = await userRepository.listUsersForAdmin();

    const payload = users.map((user) => ({
      id: user.id,
      username: user.username || "Utilisateur",
      email: user.email || "Email non renseigne",
      role: buildUserRole(user),
      status: buildUserStatus(user),
      isActive: Boolean(user.isActive),
      verified: Boolean(user.verified),
      isAdmin: isAdminUser(user),
      isArtist: Boolean(user.artist),
      ordersCount: user._count.orders,
      createdAt: user.createdAt
    }));

    return res.status(200).json({
      summary: {
        totalUsers: payload.length,
        activeUsers: payload.filter((user) => user.isActive).length,
        pendingVerificationUsers: payload.filter((user) => !user.verified).length,
        adminUsers: payload.filter((user) => user.isAdmin).length
      },
      users: payload
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin users"
    });
  }
});

router.get("/admin/artists", authRequired, adminRequired, async (_req, res) => {
  try {
    const artists = await artistRepository.listArtistsForAdmin();

    const payload = artists.map(serializeAdminArtist);

    return res.status(200).json({
      summary: {
        totalArtists: payload.length,
        verifiedArtists: payload.filter((artist) => artist.verified).length,
        pendingArtists: payload.filter((artist) => !artist.verified).length,
        totalArtworks: payload.reduce((sum, artist) => sum + artist.artworksCount, 0)
      },
      artists: payload
    });
  } catch (error) {
    console.error("Admin artists fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin artists"
    });
  }
});

router.patch("/admin/artists/:id/verification", authRequired, adminRequired, async (req, res) => {
  try {
    const artistId = Number(req.params.id);
    const { verified } = req.body;

    if (!Number.isInteger(artistId) || artistId < 1) {
      return res.status(400).json({
        message: "Invalid artist id"
      });
    }

    if (typeof verified !== "boolean") {
      return res.status(400).json({
        message: "Verified must be a boolean"
      });
    }

    const artist = await artistRepository.updateArtistVerification({
      artistId,
      verified
    });

    return res.status(200).json({
      message: verified ? "Artist profile verified" : "Artist profile moved to pending",
      artist: serializeAdminArtist(artist)
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Artist profile not found"
      });
    }

    console.error("Admin artist verification update error:", error);
    return res.status(500).json({
      message: "Unable to update artist verification"
    });
  }
});

router.get("/admin/artworks", authRequired, adminRequired, async (_req, res) => {
  try {
    const artworks = await artworkRepository.listArtworksForAdmin();

    const payload = artworks.map((artwork) => ({
      id: artwork.id,
      title: artwork.title || "Untitled artwork",
      artistName: artwork.artist?.displayName || artwork.artist?.user?.username || "Unknown artist",
      category: artwork.category?.name || "No category",
      price: artwork.price || artwork.priceTokens || "Price not set",
      protection: Boolean(artwork.protection),
      favoriteCount: artwork.favoriteCount ?? artwork._count.favorites,
      ordersCount: artwork._count.orderItems,
      status: buildArtworkStatus(artwork),
      createdAt: artwork.createdAt
    }));

    return res.status(200).json({
      summary: {
        totalArtworks: payload.length,
        protectedArtworks: payload.filter((artwork) => artwork.protection).length,
        needsCategoryArtworks: payload.filter((artwork) => artwork.status === "Needs category")
          .length,
        totalFavorites: payload.reduce((sum, artwork) => sum + (artwork.favoriteCount || 0), 0)
      },
      artworks: payload
    });
  } catch (error) {
    console.error("Admin artworks fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin artworks"
    });
  }
});

router.get("/admin/orders", authRequired, adminRequired, async (_req, res) => {
  try {
    const orders = await orderRepository.listOrdersForAdmin();

    const payload = orders.map((order) => {
      const amountValue = order.payments.reduce(
        (sum, payment) => sum + parseAmount(payment.price),
        0
      );

      return {
        id: order.id,
        reference: `#ORD-${String(order.id).padStart(4, "0")}`,
        customer: order.user?.username || order.user?.email || "Utilisateur",
        customerEmail: order.user?.email || "Email non renseigne",
        status: buildOrderStatus(order),
        amountValue,
        amount: formatCurrencyAmount(amountValue),
        itemsCount: order.items.length,
        paymentsCount: order.payments.length,
        createdAt: order.createdAt
      };
    });

    return res.status(200).json({
      summary: {
        totalOrders: payload.length,
        paidOrders: payload.filter((order) => order.status === "Paid").length,
        pendingOrders: payload.filter((order) => order.status === "Pending").length,
        refundedOrders: payload.filter((order) => order.status === "Refunded").length
      },
      orders: payload
    });
  } catch (error) {
    console.error("Admin orders fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin orders"
    });
  }
});

router.get("/admin/payments", authRequired, adminRequired, async (_req, res) => {
  try {
    const payments = await paymentRepository.listPaymentsForAdmin();

    const payload = payments.map((payment) => {
      const amountValue = parseAmount(payment.price);

      return {
        id: payment.id,
        reference: `PAY-${String(payment.id).padStart(5, "0")}`,
        orderReference: `#ORD-${String(payment.orderId).padStart(4, "0")}`,
        customer: payment.order?.user?.username || payment.order?.user?.email || "Utilisateur",
        method: payment.method || "Unknown",
        status: buildPaymentStatus(payment),
        amountValue,
        amount: formatCurrencyAmount(amountValue),
        createdAt: payment.createdAt
      };
    });

    const grossRevenue = payload.reduce((sum, payment) => {
      return payment.status === "Succeeded" ? sum + payment.amountValue : sum;
    }, 0);

    return res.status(200).json({
      summary: {
        totalPayments: payload.length,
        succeededPayments: payload.filter((payment) => payment.status === "Succeeded").length,
        pendingPayments: payload.filter((payment) => payment.status === "Pending").length,
        grossRevenue: formatCurrencyAmount(grossRevenue)
      },
      payments: payload
    });
  } catch (error) {
    console.error("Admin payments fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin payments"
    });
  }
});

router.get("/admin/dashboard", authRequired, adminRequired, async (_req, res) => {
  try {
    const [users, artists, orders, payments] = await Promise.all([
      userRepository.listUsersForAdmin(),
      artistRepository.listArtistsForAdmin(),
      orderRepository.listOrdersForAdmin(),
      paymentRepository.listPaymentsForAdmin()
    ]);

    const succeededPayments = payments.filter(
      (payment) => buildPaymentStatus(payment) === "Succeeded"
    );
    const grossRevenue = succeededPayments.reduce((sum, payment) => {
      return sum + parseAmount(payment.price);
    }, 0);

    const latestUser = users[0];
    const latestArtist = artists[0];
    const latestOrder = orders[0];
    const latestPayment = payments[0];

    return res.status(200).json({
      stats: [
        {
          label: "Users",
          value: users.length,
          description: "Tous les comptes inscrits sur la plateforme."
        },
        {
          label: "Artists",
          value: artists.length,
          description: "Profils artistes a suivre ou verifier."
        },
        {
          label: "Orders",
          value: orders.length,
          description: "Commandes enregistrees dans la base."
        },
        {
          label: "Revenue",
          value: formatCurrencyAmount(grossRevenue),
          description: "Somme des paiements reussis actuellement en base."
        }
      ],
      activities: [
        {
          title: "Dernier utilisateur cree",
          description: latestUser
            ? `${latestUser.username || latestUser.email || "Utilisateur"} a rejoint la plateforme.`
            : "Aucun utilisateur en base pour le moment.",
          tag: "US"
        },
        {
          title: "Dernier profil artiste",
          description: latestArtist
            ? `${latestArtist.displayName || latestArtist.user?.username || "Artiste"} est le profil artiste le plus recent.`
            : "Aucun profil artiste cree pour le moment.",
          tag: "AR"
        },
        {
          title: "Derniere commande",
          description: latestOrder
            ? `Commande #ORD-${String(latestOrder.id).padStart(4, "0")} au statut ${buildOrderStatus(latestOrder)}.`
            : "Aucune commande en base pour le moment.",
          tag: "OR"
        },
        {
          title: "Dernier paiement",
          description: latestPayment
            ? `Paiement PAY-${String(latestPayment.id).padStart(5, "0")} au statut ${buildPaymentStatus(latestPayment)}.`
            : "Aucun paiement en base pour le moment.",
          tag: "PY"
        }
      ],
      shortcuts: [
        {
          label: "Aller vers users",
          description: "Superviser les comptes, statuts et roles.",
          route: "/admin/users"
        },
        {
          label: "Aller vers orders",
          description: "Verifier les commandes, statuts et clients lies.",
          route: "/admin/orders"
        },
        {
          label: "Aller vers payments",
          description: "Suivre les transactions et le revenu observe.",
          route: "/admin/payments"
        }
      ]
    });
  } catch (error) {
    console.error("Admin dashboard fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin dashboard"
    });
  }
});

module.exports = router;
