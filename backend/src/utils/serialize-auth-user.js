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

function serializeAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    bio: user.bio,
    phone: user.phone,
    role: user.role || null,
    isAdmin: isAdminUser(user),
    isArtist: Boolean(user.artist),
    artist: serializeArtist(user.artist)
  };
}

module.exports = {
  serializeArtist,
  serializeAuthUser
};
