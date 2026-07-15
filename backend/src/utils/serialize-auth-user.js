const { isAdminUser } = require("../middlewares/admin-required.middleware");

function serializeArtist(artist) {
  if (!artist) {
    return null;
  }

  return {
    id: artist.id,
    displayName: artist.displayName,
    verified: Boolean(artist.verified),
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

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    bio: user.bio,
    phone: user.phone,
    role: user.role || null,
    isAdmin: admin,
    isArtist: admin ? false : Boolean(user.artist),
    artist: admin ? null : serializeArtist(user.artist),
    artistApplication: admin ? null : serializeArtistApplication(user.artistApplicationDraft)
  };
}

module.exports = {
  serializeArtist,
  serializeArtistApplication,
  serializeAuthUser
};
