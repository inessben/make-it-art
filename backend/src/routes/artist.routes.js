const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const { isAdminUser } = require("../middlewares/admin-required.middleware");
const { ensureVerifiedArtist } = require("../middlewares/artist-required.middleware");
const artistApplicationDraftRepository = require("../repositories/artist-application-draft.repository");
const artistRepository = require("../repositories/artist.repository");
const artworkRepository = require("../repositories/artwork.repository");
const categoryRepository = require("../repositories/category.repository");
const userRepository = require("../repositories/user.repository");
const { ARTIST_APPLICATION_STATUS } = require("../constants/artist-application-status");
const { normalizeArtworkLicenseType } = require("../constants/artwork-license-types");
const {
  CONTRACT_VERSION,
  extractArtistApplicationPayload,
  resolveContractSignedAt,
  renderArtistContract,
  generateArtistContractPdf
} = require("../services/artist-contract.service");
const { serializeAuthUser } = require("../utils/serialize-auth-user");
const { parsePriceValue, serializeArtwork } = require("../utils/serialize-marketplace");
const { ensureBuffer } = require("../utils/ensure-buffer");
const prisma = require("../lib/prisma");
const { handleArtworkUpload } = require("../middlewares/upload-artwork.middleware");
const {
  createSingleImageUpload,
  getUploadedImagePath
} = require("../middlewares/upload-image.middleware");
const {
  processArtworkUpload,
  deleteArtworkMediaAssets
} = require("../services/artwork-media-pipeline.service");
const {
  buildUploadedImageUrl,
  removeUploadedImage
} = require("../services/uploaded-image.service");
const env = require("../config/env");
const {
  buildArtistDashboardPayload,
  buildArtistSalesPayload
} = require("../services/artist-analytics.service");
const {
  ArtistWithdrawalError,
  buildArtistWithdrawalWorkspace,
  createArtistWithdrawalRequest,
  cancelArtistWithdrawal
} = require("../services/artist-withdrawal.service");

const router = express.Router();
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ARTIST_PROFILE_IMAGE_DIRECTORY = "artists/profile";
const handleArtistProfileImageUpload = createSingleImageUpload({
  fieldName: "image",
  relativeDirectory: ARTIST_PROFILE_IMAGE_DIRECTORY,
  maxFileSizeBytes: 8 * 1024 * 1024
});

function ensureNonAdminArtistAccess(req, res, next) {
  if (isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Admin accounts cannot access artist application routes"
    });
  }

  return next();
}

router.use("/artists/me", authRequired, ensureNonAdminArtistAccess);

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
    contractRenewalRequired: Boolean(
      draft.contractVersion && draft.contractVersion !== CONTRACT_VERSION
    ),
    hasContractPdf: Boolean(draft.contractPdf),
    lastReminderSentAt: draft.lastReminderSentAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt
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
    avatarUrl: buildUploadedImageUrl(artist.avatarPath),
    verified: Boolean(artist.verified),
    createdAt: artist.createdAt,
    bio: artist.user?.bio || "",
    email: artist.user?.email || "",
    username: artist.user?.username || "",
    stats: {
      artworks: artist._count?.artworks || 0,
      followers: artist._count?.followers || 0,
      collections: artist._count?.collections || 0
    }
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBooleanFlag(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
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
    commissionAccepted: Boolean(input.commissionAccepted)
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

function validateArtistApplicationPayload(payload, { requireAcceptances = false } = {}) {
  if (!payload.displayName) {
    return "Le nom d'artiste est requis.";
  }

  if (!payload.firstName || !payload.lastName) {
    return "Le prenom et le nom legal sont requis.";
  }

  if (!payload.addressLine1 || !payload.city || !payload.postalCode || !payload.country) {
    return "L'adresse legale complete est requise.";
  }

  if (!payload.taxId) {
    return "Le numero d'identification fiscale est requis.";
  }

  if (!payload.bio) {
    return "La bio artiste est requise.";
  }

  if (!payload.artType) {
    return "Le type d'art principal est requis.";
  }

  if (payload.styles.length === 0) {
    return "Ajoutez au moins un style ou une specialite.";
  }

  if (!isValidOptionalUrl(payload.portfolioUrl)) {
    return "Le lien de portfolio doit etre une URL valide.";
  }

  if (requireAcceptances && (!payload.termsAccepted || !payload.commissionAccepted)) {
    return "Les validations obligatoires doivent etre acceptees.";
  }

  return null;
}

function isApplicationLocked(application) {
  return (
    application &&
    [ARTIST_APPLICATION_STATUS.PENDING, ARTIST_APPLICATION_STATUS.APPROVED].includes(
      application.status
    )
  );
}

function normalizeArtworkInput(input = {}) {
  const categoryId = Number.parseInt(input.categoryId, 10);

  return {
    title: normalizeText(input.title),
    description: normalizeText(input.description),
    categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
    price: normalizeText(input.price) || normalizeText(input.priceTokens),
    licenseType: normalizeArtworkLicenseType(input.licenseType),
    protection: input.protection === true || input.protection === "true" || input.protection === "1"
  };
}

function validateArtworkInput(input) {
  if (!input.title) {
    return "Le titre de l'oeuvre est requis.";
  }

  if (input.title.length > 160) {
    return "Le titre ne peut pas depasser 160 caracteres.";
  }

  if (!input.categoryId) {
    return "La categorie de l'oeuvre est requise.";
  }

  if (!input.price) {
    return "Le prix de l'oeuvre est requis.";
  }

  if (!input.licenseType) {
    return "Le type de licence de l'oeuvre est requis.";
  }

  if (parsePriceValue(input.price) === null) {
    return "Le prix doit contenir une valeur numerique valide.";
  }

  if (input.description.length > 4000) {
    return "La description ne peut pas depasser 4000 caracteres.";
  }

  return null;
}

async function resolveCategoryId({ categoryId }) {
  if (!categoryId) {
    throw new Error("CATEGORY_REQUIRED");
  }

  const isAllowed = await categoryRepository.isPredefinedCategory(categoryId);

  if (!isAllowed) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  return categoryId;
}

function mapArtworkRouteError(error) {
  if (error?.message === "INVALID_ARTWORK_PRICE") {
    return {
      status: 400,
      message: "Le prix doit etre un montant EUR positif avec deux decimales maximum."
    };
  }

  if (error?.message === "ARTWORK_NOT_FOUND") {
    return {
      status: 404,
      message: "Oeuvre introuvable."
    };
  }

  if (error?.message === "CATEGORY_NOT_FOUND") {
    return {
      status: 400,
      message: "Categorie introuvable."
    };
  }

  if (error?.message === "CATEGORY_REQUIRED") {
    return {
      status: 400,
      message: "La categorie de l'oeuvre est requise."
    };
  }

  return null;
}

function buildContractFilename(applicationOrArtistPayload, fallbackName = "artiste") {
  const displayName =
    normalizeText(applicationOrArtistPayload?.displayName) ||
    normalizeText(applicationOrArtistPayload?.payload?.displayName) ||
    fallbackName;

  const safeName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `make-it-art-artist-contract-${safeName || "artiste"}.pdf`;
}

async function resolveApplicationContractPdf(application, fallbackUser) {
  const payload = extractArtistApplicationPayload(application);
  const existingPdf = ensureBuffer(application?.contractPdf);
  const needsRegeneration = !existingPdf || existingPdf.length === 0;

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
    user: application.user || fallbackUser,
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

router.get("/artists/me", async (req, res) => {
  try {
    const [artist, application] = await Promise.all([
      artistRepository.findByUserId(req.user.id),
      artistApplicationDraftRepository.findByUserId(req.user.id)
    ]);

    return res.status(200).json({
      artist: serializeArtistProfile(artist),
      application: serializeApplicationDraft(application)
    });
  } catch (error) {
    console.error("Artist profile fetch error:", error);
    return res.status(500).json({
      message: "Unable to load artist profile"
    });
  }
});

router.patch(
  "/artists/me/profile",
  csrfProtection,
  handleArtistProfileImageUpload,
  async (req, res) => {
    const uploadedImagePath = getUploadedImagePath(ARTIST_PROFILE_IMAGE_DIRECTORY, req.file);

    try {
      const currentArtist = await artistRepository.findByUserId(req.user.id);

      if (!currentArtist) {
        if (uploadedImagePath) {
          await removeUploadedImage(uploadedImagePath);
        }

        return res.status(404).json({
          message: "Artist profile not found"
        });
      }

      const displayName = normalizeText(req.body.displayName || currentArtist.displayName);
      const bio = normalizeText(req.body.bio ?? currentArtist.user?.bio ?? "");
      const removeAvatar = parseBooleanFlag(req.body.removeAvatar);

      if (!displayName) {
        if (uploadedImagePath) {
          await removeUploadedImage(uploadedImagePath);
        }

        return res.status(400).json({
          message: "Artist display name is required."
        });
      }

      if (displayName.length > 160) {
        if (uploadedImagePath) {
          await removeUploadedImage(uploadedImagePath);
        }

        return res.status(400).json({
          message: "Artist display name cannot exceed 160 characters."
        });
      }

      if (bio.length > 4000) {
        if (uploadedImagePath) {
          await removeUploadedImage(uploadedImagePath);
        }

        return res.status(400).json({
          message: "Artist bio cannot exceed 4000 characters."
        });
      }

      const nextAvatarPath = uploadedImagePath
        ? uploadedImagePath
        : removeAvatar
          ? null
          : currentArtist.avatarPath || null;

      const updatedArtist = await artistRepository.updateArtistProfile({
        artistId: currentArtist.id,
        userId: req.user.id,
        displayName,
        bio,
        avatarPath: nextAvatarPath
      });

      if (uploadedImagePath && currentArtist.avatarPath && currentArtist.avatarPath !== uploadedImagePath) {
        await removeUploadedImage(currentArtist.avatarPath);
      }

      if (removeAvatar && !uploadedImagePath && currentArtist.avatarPath) {
        await removeUploadedImage(currentArtist.avatarPath);
      }

      return res.status(200).json({
        message: uploadedImagePath
          ? "Artist profile updated with the new image."
          : removeAvatar
            ? "Artist profile image removed."
            : "Artist profile updated.",
        artist: serializeArtistProfile(updatedArtist)
      });
    } catch (error) {
      if (uploadedImagePath) {
        await removeUploadedImage(uploadedImagePath);
      }

      console.error("Artist profile update error:", error);
      return res.status(500).json({
        message: "Unable to update the artist profile."
      });
    }
  }
);

router.get("/artists/me/dashboard", ensureVerifiedArtist, async (req, res) => {
  try {
    const artworks = await artworkRepository.listArtworksByArtistId(req.artist.id);
    const favoritesTotal = artworks.reduce((sum, artwork) => sum + (artwork.favoriteCount || 0), 0);

    const [dashboard, withdrawalWorkspace] = await Promise.all([
      buildArtistDashboardPayload(req.artist.id, {
        userId: req.user.id,
        artworks: req.artist._count?.artworks || artworks.length,
        followers: req.artist._count?.followers || 0,
        favorites: favoritesTotal
      }),
      buildArtistWithdrawalWorkspace(req.artist.id, {
        limit: 5
      })
    ]);

    return res.status(200).json({
      ...dashboard,
      withdrawals: withdrawalWorkspace.finance,
      withdrawalSummary: withdrawalWorkspace.summary,
      recentWithdrawals: withdrawalWorkspace.requests
    });
  } catch (error) {
    console.error("Artist dashboard fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger le dashboard artiste."
    });
  }
});

router.get("/artists/me/sales", ensureVerifiedArtist, async (req, res) => {
  try {
    const payload = await buildArtistSalesPayload(req.artist.id);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("Artist sales fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos ventes."
    });
  }
});

router.get("/artists/me/withdrawals", ensureVerifiedArtist, async (req, res) => {
  try {
    const payload = await buildArtistWithdrawalWorkspace(req.artist.id);
    return res.status(200).json(payload);
  } catch (error) {
    if (error instanceof ArtistWithdrawalError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message
      });
    }

    console.error("Artist withdrawals fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos retraits."
    });
  }
});

router.post("/artists/me/withdrawals", ensureVerifiedArtist, async (req, res) => {
  try {
    const withdrawal = await createArtistWithdrawalRequest({
      artist: req.artist,
      user: req.user,
      amount: req.body?.amount,
      note: req.body?.note
    });

    return res.status(201).json({
      message: "Withdrawal request submitted and pending admin review.",
      withdrawal
    });
  } catch (error) {
    if (error instanceof ArtistWithdrawalError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message
      });
    }

    console.error("Artist withdrawal submit error:", error);
    return res.status(500).json({
      message: "Impossible de soumettre cette demande de retrait."
    });
  }
});

router.patch("/artists/me/withdrawals/:publicId/cancel", ensureVerifiedArtist, async (req, res) => {
  try {
    if (!UUID_V4_PATTERN.test(req.params.publicId)) {
      return res.status(400).json({
        message: "Invalid withdrawal request id"
      });
    }

    const withdrawal = await cancelArtistWithdrawal({
      artistId: req.artist.id,
      publicId: req.params.publicId,
      actorUserId: req.user.id
    });

    return res.status(200).json({
      message: "Withdrawal request canceled.",
      withdrawal
    });
  } catch (error) {
    if (error instanceof ArtistWithdrawalError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message
      });
    }

    console.error("Artist withdrawal cancel error:", error);
    return res.status(500).json({
      message: "Impossible d'annuler cette demande de retrait."
    });
  }
});

router.get("/artists/me/followers", async (req, res) => {
  try {
    const artist = await artistRepository.findByUserId(req.user.id);

    if (!artist) {
      return res.status(404).json({
        message: "Profil artiste introuvable."
      });
    }

    const followers = await prisma.follow.findMany({
      where: {
        artistId: artist.id
      },
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return res.status(200).json({
      followers: followers
        .map((follow) => follow.user)
        .filter(Boolean)
        .map((user) => ({
          id: user.id,
          username: user.username || "Utilisateur",
          email: user.email || ""
        }))
    });
  } catch (error) {
    console.error("Artist followers fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos followers."
    });
  }
});

router.post("/artists/me/contract-preview", async (req, res) => {
  try {
    const existingApplication = await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (isApplicationLocked(existingApplication)) {
      return res.status(409).json({
        message: "Your artist application is already under review."
      });
    }

    const payload = normalizeArtistApplicationPayload(req.body);
    const validationError = validateArtistApplicationPayload(payload, {
      requireAcceptances: true
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const contract = renderArtistContract({
      user: req.user,
      payload
    });

    return res.status(200).json({
      contractText: contract.contractText,
      contractVersion: contract.contractVersion
    });
  } catch (error) {
    console.error("Artist contract preview error:", error);
    return res.status(500).json({
      message: "Unable to generate the artist contract preview"
    });
  }
});

router.get("/artists/me/application-draft", async (req, res) => {
  try {
    const draft = await artistApplicationDraftRepository.findByUserId(req.user.id);

    return res.status(200).json({
      draft: serializeApplicationDraft(draft)
    });
  } catch (error) {
    console.error("Artist application draft fetch error:", error);
    return res.status(500).json({
      message: "Unable to load artist application draft"
    });
  }
});

router.patch("/artists/me/application-draft", async (req, res) => {
  try {
    const currentStep = Number(req.body.currentStep || 1);

    if (!Number.isInteger(currentStep) || currentStep < 1 || currentStep > 4) {
      return res.status(400).json({
        message: "Current step must be between 1 and 4"
      });
    }

    const existingApplication = await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (isApplicationLocked(existingApplication)) {
      return res.status(409).json({
        message: "Your artist application is already under review."
      });
    }

    const payload = normalizeArtistApplicationPayload(req.body.payload || {});
    const draft = await artistApplicationDraftRepository.saveDraft({
      userId: req.user.id,
      currentStep,
      payload
    });

    return res.status(200).json({
      message: "Artist application draft saved",
      draft: serializeApplicationDraft(draft)
    });
  } catch (error) {
    console.error("Artist application draft save error:", error);
    return res.status(500).json({
      message: "Unable to save artist application draft"
    });
  }
});

router.post("/artists/me", async (req, res) => {
  try {
    const existingApplication = await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (isApplicationLocked(existingApplication)) {
      return res.status(409).json({
        message: "Your artist application is already under review."
      });
    }

    const payload = normalizeArtistApplicationPayload(req.body);
    const signatureDataUrl = normalizeText(req.body.signatureDataUrl);
    const contractAccepted = Boolean(req.body.contractAccepted);
    const validationError = validateArtistApplicationPayload(payload, {
      requireAcceptances: true
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    if (!contractAccepted) {
      return res.status(400).json({
        message: "Le contrat doit etre accepte avant la soumission."
      });
    }

    if (!signatureDataUrl.startsWith("data:image/")) {
      return res.status(400).json({
        message: "La signature de l'artiste est requise."
      });
    }

    const generatedContract = await generateArtistContractPdf({
      user: req.user,
      payload,
      signatureDataUrl
    });

    const application = await artistApplicationDraftRepository.submitApplication({
      userId: req.user.id,
      currentStep: 4,
      payload,
      submittedAt: generatedContract.signedAt,
      contractVersion: generatedContract.contractVersion,
      signatureDataUrl,
      contractPdf: generatedContract.pdfBuffer
    });
    const updatedUser = await userRepository.findById(req.user.id);

    return res.status(200).json({
      message: "Artist application submitted and pending admin review",
      application: serializeApplicationDraft(application),
      user: serializeAuthUser(updatedUser)
    });
  } catch (error) {
    console.error("Artist application submit error:", error);
    return res.status(500).json({
      message: "Unable to submit artist application",
      ...(process.env.NODE_ENV !== "production" && error?.message
        ? {
            details: error.message
          }
        : {})
    });
  }
});

router.get("/artists/me/contract.pdf", async (req, res) => {
  try {
    const application = await artistApplicationDraftRepository.findByUserId(req.user.id);

    if (!application || (!application.contractPdf && !application.signatureDataUrl)) {
      return res.status(404).json({
        message: "Artist contract not found"
      });
    }

    const { payload, pdfBuffer } = await resolveApplicationContractPdf(application, req.user);
    const filename = buildContractFilename(payload, req.user.username || "artiste");
    const shouldDownload = ["1", "true", "yes"].includes(
      String(req.query.download || "").toLowerCase()
    );

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Stored artist contract PDF is unreadable");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${shouldDownload ? "attachment" : "inline"}; filename="${filename}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Artist contract download error:", error);
    return res.status(500).json({
      message: "Unable to load artist contract"
    });
  }
});

router.get("/artists/me/artworks", ensureVerifiedArtist, async (req, res) => {
  try {
    const artworks = await artworkRepository.listArtworksByArtistId(req.artist.id);

    return res.status(200).json({
      artworks: artworks.map((artwork) => serializeArtwork(artwork))
    });
  } catch (error) {
    console.error("Artist artworks fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos oeuvres."
    });
  }
});

router.post("/artists/me/artworks", ensureVerifiedArtist, handleArtworkUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Le fichier visuel de l'oeuvre est requis."
      });
    }

    const input = normalizeArtworkInput(req.body);
    const validationError = validateArtworkInput(input);

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const categoryId = await resolveCategoryId(input);
    const media = await processArtworkUpload({
      uploadedFile: req.file,
      applyWatermark: env.artworkMedia.watermarkPublicPreviews || input.protection,
      storageProviderName: env.artworkMedia.storageProvider
    });
    const artwork = await artworkRepository.createArtwork({
      artistId: req.artist.id,
      title: input.title,
      description: input.description,
      categoryId,
      price: input.price,
      licenseType: input.licenseType,
      protection: input.protection,
      imagePath: media.imagePath,
      hdPath: media.hdPath,
      previewPath: media.previewPath,
      storageProvider: media.storageProvider,
      mediaStatus: media.mediaStatus,
      watermarkApplied: media.watermarkApplied
    });

    return res.status(201).json({
      message: "Oeuvre publiee et visible dans le catalogue.",
      artwork: serializeArtwork(artwork)
    });
  } catch (error) {
    const mappedError = mapArtworkRouteError(error);

    if (mappedError) {
      return res.status(mappedError.status).json({
        message: mappedError.message
      });
    }

    if (String(error.message || "").includes("PREVIEW_GENERATION_FAILED")) {
      return res.status(500).json({
        message: "Impossible de generer l'apercu de l'oeuvre."
      });
    }

    if (
      error.message === "S3_ARTWORK_STORAGE_NOT_CONFIGURED" ||
      error.message === "CLOUDINARY_ARTWORK_STORAGE_NOT_CONFIGURED"
    ) {
      return res.status(503).json({
        message: "Le stockage distant des medias n'est pas configure."
      });
    }

    console.error("Artist artwork create error:", error);
    return res.status(500).json({
      message: "Impossible de publier cette oeuvre."
    });
  }
});

router.patch("/artists/me/artworks/:id(\\d+)", ensureVerifiedArtist, async (req, res) => {
  try {
    const artworkId = Number.parseInt(req.params.id, 10);
    const input = normalizeArtworkInput(req.body);
    const validationError = validateArtworkInput(input);

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const categoryId = await resolveCategoryId(input);
    const artwork = await artworkRepository.updateArtwork({
      artworkId,
      artistId: req.artist.id,
      title: input.title,
      description: input.description,
      categoryId,
      price: input.price,
      licenseType: input.licenseType,
      protection: input.protection
    });

    return res.status(200).json({
      message: "Oeuvre mise a jour et republiee.",
      artwork: serializeArtwork(artwork)
    });
  } catch (error) {
    const mappedError = mapArtworkRouteError(error);

    if (mappedError) {
      return res.status(mappedError.status).json({
        message: mappedError.message
      });
    }

    console.error("Artist artwork update error:", error);
    return res.status(500).json({
      message: "Impossible de mettre a jour cette oeuvre."
    });
  }
});

router.delete("/artists/me/artworks/:id(\\d+)", ensureVerifiedArtist, async (req, res) => {
  try {
    const artworkId = Number.parseInt(req.params.id, 10);

    const deleted = await artworkRepository.deleteArtwork({
      artworkId,
      artistId: req.artist.id
    });
    await deleteArtworkMediaAssets(deleted);

    return res.status(200).json({
      message: "Oeuvre supprimee."
    });
  } catch (error) {
    const mappedError = mapArtworkRouteError(error);

    if (mappedError) {
      return res.status(mappedError.status).json({
        message: mappedError.message
      });
    }

    console.error("Artist artwork delete error:", error);
    return res.status(500).json({
      message: "Impossible de supprimer cette oeuvre."
    });
  }
});

module.exports = router;
