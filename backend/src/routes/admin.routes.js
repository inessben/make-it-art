const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const {
  adminRequired,
  superAdminRequired,
  isAdminUser,
  isSuperAdminUser
} = require("../middlewares/admin-required.middleware");
const { ARTIST_APPLICATION_STATUS } = require("../constants/artist-application-status");
const {
  ARTWORK_MODERATION_STATUS,
  isArtworkModerationStatus
} = require("../constants/artwork-moderation-status");
const artistApplicationDraftRepository = require("../repositories/artist-application-draft.repository");
const userRepository = require("../repositories/user.repository");
const artistRepository = require("../repositories/artist.repository");
const artworkRepository = require("../repositories/artwork.repository");
const orderRepository = require("../repositories/order.repository");
const paymentRepository = require("../repositories/payment.repository");
const { ensureBuffer } = require("../utils/ensure-buffer");
const { inviteAdminUser } = require("../services/auth.service");
const {
  CONTRACT_VERSION,
  extractArtistApplicationPayload,
  resolveContractSignedAt,
  generateArtistContractPdf
} = require("../services/artist-contract.service");

const router = express.Router();

const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: "Pending",
  PAYMENT_PROCESSING: "Pending",
  PAYMENT_FAILED: "Failed",
  PAYMENT_REVIEW: "Pending",
  PAID: "Paid",
  CANCELED: "Canceled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

const PAYMENT_STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELED: "Canceled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

function buildUserRole(user) {
  if (isSuperAdminUser(user)) {
    return "Super admin";
  }

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

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function buildArtworkStatus(artwork) {
  const status = String(
    artwork?.moderationStatus || ARTWORK_MODERATION_STATUS.PENDING
  ).toLowerCase();

  if (status === ARTWORK_MODERATION_STATUS.APPROVED) {
    return "Published";
  }

  if (status === ARTWORK_MODERATION_STATUS.REJECTED) {
    return "Rejected";
  }

  if (status === ARTWORK_MODERATION_STATUS.HIDDEN) {
    return "Hidden";
  }

  return "Pending review";
}

function buildOrderStatus(order) {
  if (order.status) {
    return ORDER_STATUS_LABELS[order.status] || order.status;
  }

  if (
    order.payments.some(
      (payment) => buildPaymentStatus(payment) === "Succeeded",
    )
  ) {
    return "Paid";
  }

  if (
    order.payments.some(
      (payment) => buildPaymentStatus(payment) === "Refunded",
    )
  ) {
    return "Refunded";
  }

  return "Pending";
}

function buildPaymentStatus(payment) {
  if (payment.status) {
    return PAYMENT_STATUS_LABELS[payment.status] || payment.status;
  }

  return "Pending";
}

async function resolveApplicationContractPdf(application) {
  const payload = extractArtistApplicationPayload(application);
  const existingPdf = ensureBuffer(application?.contractPdf);
  const needsRegeneration =
    application?.contractVersion !== CONTRACT_VERSION || !existingPdf || existingPdf.length === 0;

  if (!needsRegeneration) {
    return {
      payload,
      pdfBuffer: existingPdf
    };
  }

  if (!application?.signatureDataUrl) {
    if (!existingPdf || existingPdf.length === 0) {
      throw new Error("Artist contract signature data is unavailable");
    }

    return {
      payload,
      pdfBuffer: existingPdf
    };
  }

  const signedAt = resolveContractSignedAt(application);
  const regeneratedContract = await generateArtistContractPdf({
    user: application.user,
    payload,
    signatureDataUrl: application.signatureDataUrl,
    signedAt
  });

  await artistApplicationDraftRepository.updateStoredContract({
    applicationId: application.id,
    contractVersion: regeneratedContract.contractVersion,
    contractPdf: regeneratedContract.pdfBuffer,
    contractSignedAt: signedAt,
    contractAcceptedAt: application.contractAcceptedAt || signedAt
  });

  return {
    payload,
    pdfBuffer: regeneratedContract.pdfBuffer
  };
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

function getPaymentAmountValue(payment) {
  if (Number.isSafeInteger(payment.amount) && payment.amount >= 0) {
    return payment.amount / 100;
  }

  return parseAmount(payment.price);
}

function getOrderAmountValue(order) {
  if (Number.isSafeInteger(order.totalAmount) && order.totalAmount >= 0) {
    return order.totalAmount / 100;
  }

  return order.payments.reduce(
    (sum, payment) => sum + getPaymentAmountValue(payment),
    0,
  );
}

function getArtworkPriceLabel(artwork) {
  if (Number.isSafeInteger(artwork.priceAmount) && artwork.priceAmount > 0) {
    return formatCurrencyAmount(artwork.priceAmount / 100);
  }

  return artwork.price || artwork.priceTokens || "Price not set";
}

function serializeAdminArtist(artist) {
  return {
    id: artist.id,
    userId: artist.userId,
    name: artist.displayName || artist.user?.username || "Unnamed artist",
    email: artist.user?.email || "Email not provided",
    bio: artist.user?.bio || "No bio yet.",
    verified: Boolean(artist.verified),
    isActive: Boolean(artist.user?.isActive),
    isAdmin: isAdminUser(artist.user),
    artworksCount: artist._count.artworks,
    followersCount: artist._count.followers,
    collectionsCount: artist._count.collections,
    createdAt: artist.createdAt || artist.user?.createdAt || null
  };
}

function serializeAdminUser(user) {
  return {
    id: user.id,
    username: user.username || "User",
    email: user.email || "Email not provided",
    phone: user.phone || "",
    role: buildUserRole(user),
    status: buildUserStatus(user),
    isActive: Boolean(user.isActive),
    verified: Boolean(user.verified),
    isAdmin: isAdminUser(user),
    isSuperAdmin: isSuperAdminUser(user),
    isArtist: Boolean(user.artist),
    ordersCount: user._count?.orders || 0,
    createdAt: user.createdAt
  };
}

function serializeAdminArtistApplication(application) {
  const payload =
    application.payload && typeof application.payload === "object" ? application.payload : {};
  const applicantName = [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim();
  const displayName = payload.displayName || application.user?.username || "Unnamed artist";

  return {
    id: application.id,
    userId: application.userId,
    applicantName: applicantName || application.user?.username || "User",
    displayName,
    email: application.user?.email || "Email not provided",
    phone: application.user?.phone || "Phone not provided",
    status: application.status || ARTIST_APPLICATION_STATUS.DRAFT,
    bio: payload.bio || application.user?.bio || "",
    artType: payload.artType || "Not provided",
    styles: Array.isArray(payload.styles) ? payload.styles : [],
    portfolioUrl: payload.portfolioUrl || "",
    socialHandle: payload.socialHandle || "",
    addressLine1: payload.addressLine1 || "",
    addressLine2: payload.addressLine2 || "",
    city: payload.city || "",
    region: payload.region || "",
    postalCode: payload.postalCode || "",
    country: payload.country || "",
    taxId: payload.taxId || "",
    hasContractPdf: Boolean(application.contractPdf),
    contractVersion: application.contractVersion || null,
    submittedAt: application.submittedAt || application.completedAt || application.updatedAt,
    reviewedAt: application.reviewedAt || null,
    reviewNote: application.reviewNote || "",
    reviewerName: application.reviewedByAdmin?.username || application.reviewedByAdmin?.email || "",
    artistActivated: Boolean(application.user?.artist),
    verified: Boolean(application.user?.artist?.verified)
  };
}

function serializeAdminArtwork(artwork) {
  return {
    id: artwork.id,
    title: artwork.title || "Untitled artwork",
    artistId: artwork.artistId,
    artistName: artwork.artist?.displayName || artwork.artist?.user?.username || "Unknown artist",
    category: artwork.category?.name || "No category",
    price: artwork.price || artwork.priceTokens || "Price not set",
    protection: Boolean(artwork.protection),
    favoriteCount: artwork.favoriteCount ?? artwork._count?.favorites ?? 0,
    ordersCount: artwork._count?.orderItems ?? 0,
    status: String(artwork.moderationStatus || ARTWORK_MODERATION_STATUS.PENDING).toLowerCase(),
    statusLabel: buildArtworkStatus(artwork),
    moderationNote: artwork.moderationNote || "",
    moderatedAt: artwork.moderatedAt || null,
    reviewerName: artwork.moderatedByAdmin?.username || artwork.moderatedByAdmin?.email || "",
    isPubliclyVisible:
      String(artwork.moderationStatus || "").toLowerCase() === ARTWORK_MODERATION_STATUS.APPROVED,
    createdAt: artwork.createdAt
  };
}

router.get("/admin/users", authRequired, adminRequired, async (req, res) => {
  try {
    const users = await userRepository.listUsersForAdmin();
    const payload = users.map(serializeAdminUser);

    return res.status(200).json({
      summary: {
        totalUsers: payload.length,
        activeUsers: payload.filter((user) => user.isActive).length,
        pendingVerificationUsers: payload.filter((user) => !user.verified).length,
        adminUsers: payload.filter((user) => user.isAdmin).length,
        superAdminUsers: payload.filter((user) => user.isSuperAdmin).length
      },
      permissions: {
        canManageAdmins: isSuperAdminUser(req.user),
        isSuperAdmin: isSuperAdminUser(req.user)
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

router.post(
  "/admin/users/admins",
  authRequired,
  adminRequired,
  superAdminRequired,
  async (req, res) => {
    try {
      const username = normalizeText(req.body.username);
      const email = normalizeEmail(req.body.email);
      const phone = normalizeText(req.body.phone);
      const isSuperAdmin = Boolean(req.body.isSuperAdmin);

      if (!username || !email) {
        return res.status(400).json({
          message: "Username and email are required"
        });
      }

      const invitedUser = await inviteAdminUser({
        username,
        email,
        phone,
        isSuperAdmin
      });

      return res.status(201).json({
        message: isSuperAdmin ? "Super admin invitation sent" : "Admin invitation sent",
        user: serializeAdminUser(invitedUser)
      });
    } catch (error) {
      if (error.code === "P2002" || error.message === "Email already in use") {
        return res.status(409).json({
          message: "Email is already in use"
        });
      }

      console.error("Admin invitation error:", error);

      return res.status(500).json({
        message: "Unable to invite this admin"
      });
    }
  }
);

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

router.get("/admin/artist-applications", authRequired, adminRequired, async (_req, res) => {
  try {
    const applications = await artistApplicationDraftRepository.listSubmittedApplications();
    const payload = applications.map(serializeAdminArtistApplication);

    return res.status(200).json({
      summary: {
        totalApplications: payload.length,
        pendingApplications: payload.filter(
          (application) => application.status === ARTIST_APPLICATION_STATUS.PENDING
        ).length,
        approvedApplications: payload.filter(
          (application) => application.status === ARTIST_APPLICATION_STATUS.APPROVED
        ).length,
        rejectedApplications: payload.filter(
          (application) => application.status === ARTIST_APPLICATION_STATUS.REJECTED
        ).length
      },
      applications: payload
    });
  } catch (error) {
    console.error("Admin artist applications fetch error:", error);

    return res.status(500).json({
      message: "Unable to load artist applications"
    });
  }
});

router.patch("/admin/artist-applications/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();
    const reviewNote = String(req.body.reviewNote || "").trim();

    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({
        message: "Invalid artist application id"
      });
    }

    if (
      ![ARTIST_APPLICATION_STATUS.APPROVED, ARTIST_APPLICATION_STATUS.REJECTED].includes(status)
    ) {
      return res.status(400).json({
        message: "Status must be approved or rejected"
      });
    }

    const application =
      status === ARTIST_APPLICATION_STATUS.APPROVED
        ? await artistApplicationDraftRepository.markApproved({
            applicationId,
            reviewedByAdminId: req.user.id,
            reviewNote
          })
        : await artistApplicationDraftRepository.markRejected({
            applicationId,
            reviewedByAdminId: req.user.id,
            reviewNote
          });

    return res.status(200).json({
      message:
        status === ARTIST_APPLICATION_STATUS.APPROVED
          ? "Artist application approved"
          : "Artist application rejected",
      application: serializeAdminArtistApplication(application)
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Artist application not found"
      });
    }

    console.error("Admin artist application review error:", error);
    return res.status(500).json({
      message: "Unable to review artist application"
    });
  }
});

router.get(
  "/admin/artist-applications/:id/contract.pdf",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const applicationId = Number(req.params.id);

      if (!Number.isInteger(applicationId) || applicationId < 1) {
        return res.status(400).json({
          message: "Invalid artist application id"
        });
      }

      const application = await artistApplicationDraftRepository.findById(applicationId);

      if (!application || (!application.contractPdf && !application.signatureDataUrl)) {
        return res.status(404).json({
          message: "Artist contract not found"
        });
      }

      const { payload, pdfBuffer } = await resolveApplicationContractPdf(application);
      const nameSource =
        payload.displayName || application.user?.username || application.user?.email || "artist";
      const safeName = String(nameSource)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Stored artist contract PDF is unreadable");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="make-it-art-artist-contract-${safeName || "artist"}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("Admin artist contract download error:", error);
      return res.status(500).json({
        message: "Unable to load artist contract"
      });
    }
  }
);

router.get("/admin/artworks", authRequired, adminRequired, async (_req, res) => {
  try {
    const artworks = await artworkRepository.listArtworksForAdmin();
    const payload = artworks.map(serializeAdminArtwork);

    return res.status(200).json({
      summary: {
        totalArtworks: payload.length,
        pendingArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.PENDING
        ).length,
        approvedArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.APPROVED
        ).length,
        rejectedArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.REJECTED
        ).length,
        hiddenArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.HIDDEN
        ).length,
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

router.patch("/admin/artworks/:id/moderation", authRequired, adminRequired, async (req, res) => {
  try {
    const artworkId = Number(req.params.id);
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();
    const moderationNote = String(req.body.moderationNote || req.body.reviewNote || "").trim();

    if (!Number.isInteger(artworkId) || artworkId < 1) {
      return res.status(400).json({
        message: "Invalid artwork id"
      });
    }

    if (!isArtworkModerationStatus(status)) {
      return res.status(400).json({
        message: "Status must be pending, approved, rejected or hidden"
      });
    }

    const artwork = await artworkRepository.updateArtworkModeration({
      artworkId,
      status,
      moderationNote,
      moderatedByAdminId: req.user.id
    });

    return res.status(200).json({
      message: `Artwork marked as ${buildArtworkStatus(artwork).toLowerCase()}.`,
      artwork: serializeAdminArtwork(artwork)
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Artwork not found"
      });
    }

    console.error("Admin artwork moderation update error:", error);

    return res.status(500).json({
      message: "Unable to update artwork moderation"
    });
  }
});

router.get("/admin/orders", authRequired, adminRequired, async (_req, res) => {
  try {
    const orders = await orderRepository.listOrdersForAdmin();

    const payload = orders.map((order) => {
      const amountValue = getOrderAmountValue(order);

      return {
        id: order.id,
        reference: `#ORD-${String(order.id).padStart(4, "0")}`,
        customer: order.user?.username || order.user?.email || "User",
        customerEmail: order.user?.email || "Email not provided",
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
      const amountValue = getPaymentAmountValue(payment);

      return {
        id: payment.id,
        reference: `PAY-${String(payment.id).padStart(5, "0")}`,
        orderReference: `#ORD-${String(payment.orderId).padStart(4, "0")}`,
        customer: payment.order?.user?.username || payment.order?.user?.email || "User",
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
    const grossRevenue = succeededPayments.reduce(
      (sum, payment) => sum + getPaymentAmountValue(payment),
      0
    );

    const latestUser = users[0];
    const latestArtist = artists[0];
    const latestOrder = orders[0];
    const latestPayment = payments[0];

    return res.status(200).json({
      stats: [
        {
          label: "Users",
          value: users.length,
          description: "All accounts registered on the platform."
        },
        {
          label: "Artists",
          value: artists.length,
          description: "Artist profiles to review or verify."
        },
        {
          label: "Orders",
          value: orders.length,
          description: "Orders currently stored in the database."
        },
        {
          label: "Revenue",
          value: formatCurrencyAmount(grossRevenue),
          description: "Total value of successful payments in the database."
        }
      ],
      activities: [
        {
          title: "Latest user",
          description: latestUser
            ? `${latestUser.username || latestUser.email || "User"} joined the platform.`
            : "No users are currently available.",
          tag: "US"
        },
        {
          title: "Latest artist profile",
          description: latestArtist
            ? `${latestArtist.displayName || latestArtist.user?.username || "Artist"} is the most recent artist profile.`
            : "No artist profiles have been created yet.",
          tag: "AR"
        },
        {
          title: "Latest order",
          description: latestOrder
            ? `Order #ORD-${String(latestOrder.id).padStart(4, "0")} has status ${buildOrderStatus(latestOrder)}.`
            : "No orders are currently available.",
          tag: "OR"
        },
        {
          title: "Latest payment",
          description: latestPayment
            ? `Payment PAY-${String(latestPayment.id).padStart(5, "0")} has status ${buildPaymentStatus(latestPayment)}.`
            : "No payments are currently available.",
          tag: "PY"
        }
      ],
      shortcuts: [
        {
          label: "Go to users",
          description: "Review accounts, statuses and roles.",
          route: "/admin/users"
        },
        {
          label: "Go to orders",
          description: "Review orders, statuses and associated customers.",
          route: "/admin/orders"
        },
        {
          label: "Go to payments",
          description: "Track transactions and recorded revenue.",
          route: "/admin/payments"
        },
        {
          label: "Go to settings",
          description: "Update the admin account and its security settings.",
          route: "/admin/settings"
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
