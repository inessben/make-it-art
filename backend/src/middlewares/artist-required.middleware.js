const { isAdminUser } = require("./admin-required.middleware");
const artistRepository = require("../repositories/artist.repository");

async function ensureVerifiedArtist(req, res, next) {
  if (isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Les comptes admin ne peuvent pas publier des oeuvres."
    });
  }

  const artist = await artistRepository.findByUserId(req.user.id);

  if (!artist) {
    return res.status(403).json({
      message: "Seuls les artistes peuvent publier des oeuvres."
    });
  }

  const applicationStatus = req.user?.artistApplicationDraft?.status;
  const isApprovedApplication = applicationStatus === "approved";

  if (!artist.verified && !isApprovedApplication) {
    return res.status(403).json({
      message: "Votre profil artiste doit etre valide avant de publier des oeuvres."
    });
  }

  // Heal profiles that were approved in the application workflow but still
  // marked unverified (legacy or partial activation).
  if (!artist.verified && isApprovedApplication) {
    const healed = await artistRepository.updateArtistVerification({
      artistId: artist.id,
      verified: true
    });
    req.artist = healed;
    return next();
  }

  req.artist = artist;
  return next();
}

module.exports = {
  ensureVerifiedArtist
};
