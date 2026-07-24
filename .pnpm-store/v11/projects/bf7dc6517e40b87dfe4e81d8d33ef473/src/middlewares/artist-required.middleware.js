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

  if (!artist.verified) {
    return res.status(403).json({
      message: "Votre profil artiste doit etre valide avant de publier des oeuvres."
    });
  }

  req.artist = artist;
  return next();
}

module.exports = {
  ensureVerifiedArtist
};
