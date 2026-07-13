const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { isAdminUser } = require("../middlewares/admin-required.middleware");
const artistApplicationDraftRepository = require("../repositories/artist-application-draft.repository");
const artistRepository = require("../repositories/artist.repository");
const userRepository = require("../repositories/user.repository");
const {
  ARTIST_APPLICATION_STATUS,
} = require("../constants/artist-application-status");
const {
  CONTRACT_VERSION,
  extractArtistApplicationPayload,
  resolveContractSignedAt,
  renderArtistContract,
  generateArtistContractPdf,
} = require("../services/artist-contract.service");
const { serializeAuthUser } = require("../utils/serialize-auth-user");
const { ensureBuffer } = require("../utils/ensure-buffer");

const router = express.Router();

function ensureNonAdminArtistAccess(req, res, next) {
  if (isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Admin accounts cannot access artist application routes",
    });
  }

  return next();
}

router.use("/artists", authRequired, ensureNonAdminArtistAccess);

function serializeApplicationDraft(draft) {
  if (!draft) {
    return null;
  }

  return {
    id: draft.id,
    status: draft.status || ARTIST_APPLICATION_STATUS.DRAFT,
    currentStep: draft.currentStep,
    payload: draft.payload || {},
    completedAt: draft.completedAt,
    submittedAt: draft.submittedAt,
    reviewedAt: draft.reviewedAt,
    reviewNote: draft.reviewNote || "",
    contractAcceptedAt: draft.contractAcceptedAt,
    contractSignedAt: draft.contractSignedAt,
    contractVersion: draft.contractVersion || null,
    hasContractPdf: Boolean(draft.contractPdf),
    lastReminderSentAt: draft.lastReminderSentAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

function serializeArtistProfile(artist) {
  if (!artist) {
    return null;
  }

  return {
    id: artist.id,
    userId: artist.userId,
    displayName: artist.displayName,
    verified: Boolean(artist.verified),
    createdAt: artist.createdAt,
    bio: artist.user?.bio || "",
    email: artist.user?.email || "",
    username: artist.user?.username || "",
    stats: {
      artworks: artist._count?.artworks || 0,
      followers: artist._count?.followers || 0,
      collections: artist._count?.collections || 0,
    },
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStyles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => normalizeText(item)).filter(Boolean))];
}

function normalizeArtistApplicationPayload(input = {}) {
  return {
    displayName: normalizeText(input.displayName),
    firstName: normalizeText(input.firstName),
    lastName: normalizeText(input.lastName),
    bio: normalizeText(input.bio),
    artType: normalizeText(input.artType),
    styles: normalizeStyles(input.styles),
    portfolioUrl: normalizeText(input.portfolioUrl),
    socialHandle: normalizeText(input.socialHandle),
    addressLine1: normalizeText(input.addressLine1),
    addressLine2: normalizeText(input.addressLine2),
    city: normalizeText(input.city),
    region: normalizeText(input.region),
    postalCode: normalizeText(input.postalCode),
    country: normalizeText(input.country),
    taxId: normalizeText(input.taxId),
    termsAccepted: Boolean(input.termsAccepted),
    commissionAccepted: Boolean(input.commissionAccepted),
  };
}

function isValidOptionalUrl(value) {
  if (!value) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_error) {
    return false;
  }
}

function validateArtistApplicationPayload(
  payload,
  { requireAcceptances = false } = {},
) {
  if (!payload.displayName) {
    return "Artist name is required.";
  }

  if (!payload.firstName || !payload.lastName) {
    return "Legal first and last names are required.";
  }

  if (
    !payload.addressLine1 ||
    !payload.city ||
    !payload.postalCode ||
    !payload.country
  ) {
    return "A complete legal address is required.";
  }

  if (!payload.taxId) {
    return "A tax identification number is required.";
  }

  if (!payload.bio) {
    return "Artist bio is required.";
  }

  if (!payload.artType) {
    return "A primary art type is required.";
  }

  if (payload.styles.length === 0) {
    return "Add at least one style or specialty.";
  }

  if (!isValidOptionalUrl(payload.portfolioUrl)) {
    return "The portfolio link must be a valid URL.";
  }

  if (
    requireAcceptances &&
    (!payload.termsAccepted || !payload.commissionAccepted)
  ) {
    return "All required confirmations must be accepted.";
  }

  return null;
}

function isApplicationLocked(application) {
  return (
    application &&
    [
      ARTIST_APPLICATION_STATUS.PENDING,
      ARTIST_APPLICATION_STATUS.APPROVED,
    ].includes(application.status)
  );
}

function buildContractFilename(
  applicationOrArtistPayload,
  fallbackName = "artist",
) {
  const displayName =
    normalizeText(applicationOrArtistPayload?.displayName) ||
    normalizeText(applicationOrArtistPayload?.payload?.displayName) ||
    fallbackName;

  const safeName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `make-it-art-artist-contract-${safeName || "artist"}.pdf`;
}

async function resolveApplicationContractPdf(application, fallbackUser) {
  const payload = extractArtistApplicationPayload(application);
  const existingPdf = ensureBuffer(application?.contractPdf);
  const needsRegeneration =
    application?.contractVersion !== CONTRACT_VERSION ||
    !existingPdf ||
    existingPdf.length === 0;

  if (!needsRegeneration) {
    return {
      payload,
      pdfBuffer: existingPdf,
    };
  }

  if (!application?.signatureDataUrl) {
    if (!existingPdf || existingPdf.length === 0) {
      throw new Error("Artist contract signature data is unavailable");
    }

    return {
      payload,
      pdfBuffer: existingPdf,
    };
  }

  const signedAt = resolveContractSignedAt(application);
  const regeneratedContract = await generateArtistContractPdf({
    user: application.user || fallbackUser,
    payload,
    signatureDataUrl: application.signatureDataUrl,
    signedAt,
  });

  await artistApplicationDraftRepository.updateStoredContract({
    applicationId: application.id,
    contractVersion: regeneratedContract.contractVersion,
    contractPdf: regeneratedContract.pdfBuffer,
    contractSignedAt: signedAt,
    contractAcceptedAt: application.contractAcceptedAt || signedAt,
  });

  return {
    payload,
    pdfBuffer: regeneratedContract.pdfBuffer,
  };
}

router.get("/artists/me", async (req, res) => {
  try {
    const [artist, application] = await Promise.all([
      artistRepository.findByUserId(req.user.id),
      artistApplicationDraftRepository.findByUserId(req.user.id),
    ]);

    return res.status(200).json({
      artist: serializeArtistProfile(artist),
      application: serializeApplicationDraft(application),
    });
  } catch (error) {
    console.error("Artist profile fetch error:", error);
    return res.status(500).json({
      message: "Unable to load artist profile",
    });
  }
});

router.post("/artists/me/contract-preview", async (req, res) => {
  try {
    const existingApplication =
      await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (isApplicationLocked(existingApplication)) {
      return res.status(409).json({
        message: "Your artist application is already under review.",
      });
    }

    const payload = normalizeArtistApplicationPayload(req.body);
    const validationError = validateArtistApplicationPayload(payload, {
      requireAcceptances: true,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const contract = renderArtistContract({
      user: req.user,
      payload,
    });

    return res.status(200).json({
      contractText: contract.contractText,
      contractVersion: contract.contractVersion,
    });
  } catch (error) {
    console.error("Artist contract preview error:", error);
    return res.status(500).json({
      message: "Unable to generate the artist contract preview",
    });
  }
});

router.get("/artists/me/application-draft", async (req, res) => {
  try {
    const draft = await artistApplicationDraftRepository.findByUserId(
      req.user.id,
    );

    return res.status(200).json({
      draft: serializeApplicationDraft(draft),
    });
  } catch (error) {
    console.error("Artist application draft fetch error:", error);
    return res.status(500).json({
      message: "Unable to load artist application draft",
    });
  }
});

router.patch("/artists/me/application-draft", async (req, res) => {
  try {
    const currentStep = Number(req.body.currentStep || 1);

    if (!Number.isInteger(currentStep) || currentStep < 1 || currentStep > 4) {
      return res.status(400).json({
        message: "Current step must be between 1 and 4",
      });
    }

    const existingApplication =
      await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (isApplicationLocked(existingApplication)) {
      return res.status(409).json({
        message: "Your artist application is already under review.",
      });
    }

    const payload = normalizeArtistApplicationPayload(req.body.payload || {});
    const draft = await artistApplicationDraftRepository.saveDraft({
      userId: req.user.id,
      currentStep,
      payload,
    });

    return res.status(200).json({
      message: "Artist application draft saved",
      draft: serializeApplicationDraft(draft),
    });
  } catch (error) {
    console.error("Artist application draft save error:", error);
    return res.status(500).json({
      message: "Unable to save artist application draft",
    });
  }
});

router.post("/artists/me", async (req, res) => {
  try {
    const existingApplication =
      await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (isApplicationLocked(existingApplication)) {
      return res.status(409).json({
        message: "Your artist application is already under review.",
      });
    }

    const payload = normalizeArtistApplicationPayload(req.body);
    const signatureDataUrl = normalizeText(req.body.signatureDataUrl);
    const contractAccepted = Boolean(req.body.contractAccepted);
    const validationError = validateArtistApplicationPayload(payload, {
      requireAcceptances: true,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (!contractAccepted) {
      return res.status(400).json({
        message: "The agreement must be accepted before submission.",
      });
    }

    if (!signatureDataUrl.startsWith("data:image/")) {
      return res.status(400).json({
        message: "The artist's signature is required.",
      });
    }

    const generatedContract = await generateArtistContractPdf({
      user: req.user,
      payload,
      signatureDataUrl,
    });

    const application =
      await artistApplicationDraftRepository.submitApplication({
        userId: req.user.id,
        currentStep: 4,
        payload,
        submittedAt: generatedContract.signedAt,
        contractVersion: generatedContract.contractVersion,
        signatureDataUrl,
        contractPdf: generatedContract.pdfBuffer,
      });
    const updatedUser = await userRepository.findById(req.user.id);

    return res.status(200).json({
      message: "Artist application submitted and pending admin review",
      application: serializeApplicationDraft(application),
      user: serializeAuthUser(updatedUser),
    });
  } catch (error) {
    console.error("Artist application submit error:", error);
    return res.status(500).json({
      message: "Unable to submit artist application",
      ...(process.env.NODE_ENV !== "production" && error?.message
        ? {
            details: error.message,
          }
        : {}),
    });
  }
});

router.get("/artists/me/contract.pdf", async (req, res) => {
  try {
    const application = await artistApplicationDraftRepository.findByUserId(
      req.user.id,
    );

    if (
      !application ||
      (!application.contractPdf && !application.signatureDataUrl)
    ) {
      return res.status(404).json({
        message: "Artist contract not found",
      });
    }

    const { payload, pdfBuffer } = await resolveApplicationContractPdf(
      application,
      req.user,
    );
    const filename = buildContractFilename(
      payload,
      req.user.username || "artist",
    );
    const shouldDownload = ["1", "true", "yes"].includes(
      String(req.query.download || "").toLowerCase(),
    );

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Stored artist contract PDF is unreadable");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${shouldDownload ? "attachment" : "inline"}; filename="${filename}"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Artist contract download error:", error);
    return res.status(500).json({
      message: "Unable to load artist contract",
    });
  }
});

module.exports = router;
