const prisma = require("../lib/prisma");
const { ARTIST_APPLICATION_STATUS } = require("../constants/artist-application-status");

function includeApplicationRelations() {
  return {
    user: {
      include: {
        admin: true,
        artist: true
      }
    },
    reviewedByAdmin: {
      include: {
        admin: true
      }
    }
  };
}

async function findByUserId(userId) {
  return prisma.artistApplicationDraft.findUnique({
    where: { userId },
    include: includeApplicationRelations()
  });
}

async function findById(id) {
  return prisma.artistApplicationDraft.findUnique({
    where: { id },
    include: includeApplicationRelations()
  });
}

async function listSubmittedApplications() {
  return prisma.artistApplicationDraft.findMany({
    where: {
      status: {
        in: [
          ARTIST_APPLICATION_STATUS.PENDING,
          ARTIST_APPLICATION_STATUS.APPROVED,
          ARTIST_APPLICATION_STATUS.REJECTED
        ]
      }
    },
    orderBy: [
      {
        submittedAt: "desc"
      },
      {
        updatedAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: includeApplicationRelations()
  });
}

async function saveDraft({ userId, currentStep, payload }) {
  return prisma.artistApplicationDraft.upsert({
    where: { userId },
    create: {
      userId,
      currentStep,
      payload,
      status: ARTIST_APPLICATION_STATUS.DRAFT,
      completedAt: null,
      submittedAt: null,
      reviewedAt: null,
      reviewedByAdminId: null,
      reviewNote: null,
      contractAcceptedAt: null,
      contractSignedAt: null,
      contractVersion: null,
      signatureDataUrl: null,
      contractPdf: null
    },
    update: {
      currentStep,
      payload,
      status: ARTIST_APPLICATION_STATUS.DRAFT,
      completedAt: null,
      submittedAt: null,
      reviewedAt: null,
      reviewedByAdminId: null,
      reviewNote: null,
      contractAcceptedAt: null,
      contractSignedAt: null,
      contractVersion: null,
      signatureDataUrl: null,
      contractPdf: null
    },
    include: includeApplicationRelations()
  });
}

async function submitApplication({
  userId,
  currentStep,
  payload,
  contractVersion,
  signatureDataUrl,
  contractPdf,
  submittedAt = new Date()
}) {
  return prisma.artistApplicationDraft.upsert({
    where: { userId },
    create: {
      userId,
      currentStep,
      payload,
      status: ARTIST_APPLICATION_STATUS.PENDING,
      completedAt: submittedAt,
      submittedAt,
      reviewedAt: null,
      reviewedByAdminId: null,
      reviewNote: null,
      contractAcceptedAt: submittedAt,
      contractSignedAt: submittedAt,
      contractVersion,
      signatureDataUrl,
      contractPdf
    },
    update: {
      currentStep,
      payload,
      status: ARTIST_APPLICATION_STATUS.PENDING,
      completedAt: submittedAt,
      submittedAt,
      reviewedAt: null,
      reviewedByAdminId: null,
      reviewNote: null,
      contractAcceptedAt: submittedAt,
      contractSignedAt: submittedAt,
      contractVersion,
      signatureDataUrl,
      contractPdf
    },
    include: includeApplicationRelations()
  });
}

async function markApproved({ applicationId, reviewedByAdminId, reviewNote }) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.artistApplicationDraft.update({
      where: { id: applicationId },
      data: {
        status: ARTIST_APPLICATION_STATUS.APPROVED,
        reviewedAt: new Date(),
        reviewedByAdminId,
        reviewNote: reviewNote || null
      }
    });

    const payload = application.payload && typeof application.payload === "object"
      ? application.payload
      : {};
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
    const bio = typeof payload.bio === "string" ? payload.bio.trim() : "";

    await tx.user.update({
      where: { id: application.userId },
      data: {
        ...(bio ? { bio } : {})
      }
    });

    await tx.artist.upsert({
      where: { userId: application.userId },
      create: {
        userId: application.userId,
        displayName,
        verified: true,
        createdAt: application.submittedAt || new Date()
      },
      update: {
        displayName,
        verified: true
      }
    });

    return tx.artistApplicationDraft.findUnique({
      where: { id: applicationId },
      include: includeApplicationRelations()
    });
  });
}

async function markRejected({ applicationId, reviewedByAdminId, reviewNote }) {
  return prisma.artistApplicationDraft.update({
    where: { id: applicationId },
    data: {
      status: ARTIST_APPLICATION_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedByAdminId,
      reviewNote: reviewNote || null
    },
    include: includeApplicationRelations()
  });
}

async function updateStoredContract({
  applicationId,
  contractVersion,
  contractPdf,
  contractSignedAt,
  contractAcceptedAt
}) {
  return prisma.artistApplicationDraft.update({
    where: { id: applicationId },
    data: {
      contractVersion,
      contractPdf,
      ...(contractSignedAt ? { contractSignedAt } : {}),
      ...(contractAcceptedAt ? { contractAcceptedAt } : {})
    },
    include: includeApplicationRelations()
  });
}

module.exports = {
  findByUserId,
  findById,
  listSubmittedApplications,
  saveDraft,
  submitApplication,
  markApproved,
  markRejected,
  updateStoredContract
};
