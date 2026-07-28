const { isAdminUser } = require("../middlewares/admin-required.middleware");
const { buildUploadedImageUrl } = require("../services/uploaded-image.service");

function serializeArtist(artist, application = null) {
  if (!artist) {
    return null;
  }

  const approvedByApplication = application?.status === "approved";

  return {
    id: artist.id,
    displayName: artist.displayName,
    avatarUrl: buildUploadedImageUrl(artist.avatarPath),
    coverUrl: buildUploadedImageUrl(artist.coverPath),
    verified: Boolean(artist.verified) || approvedByApplication,
    createdAt: artist.createdAt
  };
}

function serializeArtistApplication(application) {
  if (!application) {
    return null;
  }

  return {
    id: application.id,
    status: application.status || "draft",
    currentStep: application.currentStep,
    submittedAt: application.submittedAt || null,
    reviewedAt: application.reviewedAt || null,
    reviewNote: application.reviewNote || "",
    contractSignedAt: application.contractSignedAt || null,
    contractVersion: application.contractVersion || null,
    hasContractPdf: Boolean(application.contractPdf)
  };
}

function serializeAuthUser(user) {
  const admin = isAdminUser(user);
  const application = user.artistApplicationDraft || null;

  return {
    id: user.id,
    email: user.email,
    verified: Boolean(user.verified),
    username: user.username,
    bio: user.bio,
    phone: user.phone,
    role: user.role || null,
    isAdmin: admin,
    isSuperAdmin: admin ? Boolean(user.admin?.isSuperAdmin) : false,
    isArtist: admin ? false : Boolean(user.artist),
    artist: admin ? null : serializeArtist(user.artist, application),
    artistApplication: admin ? null : serializeArtistApplication(application)
  };
}

module.exports = {
  serializeArtist,
  serializeArtistApplication,
  serializeAuthUser
};
