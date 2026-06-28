const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const artistApplicationDraftRepository = require("../repositories/artist-application-draft.repository");
const artistRepository = require("../repositories/artist.repository");
const { serializeAuthUser } = require("../utils/serialize-auth-user");

const router = express.Router();

function serializeApplicationDraft(draft) {
  if (!draft) {
    return null;
  }

  return {
    id: draft.id,
    currentStep: draft.currentStep,
    payload: draft.payload || {},
    completedAt: draft.completedAt,
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

router.get("/artists/me", authRequired, async (req, res) => {
  try {
    const artist = await artistRepository.findByUserId(req.user.id);

    if (!artist) {
      return res.status(404).json({
        message: "Artist profile not found"
      });
    }

    return res.status(200).json({
      artist: serializeArtistProfile(artist)
    });
  } catch (error) {
    console.error("Artist profile fetch error:", error);
    return res.status(500).json({
      message: "Unable to load artist profile"
    });
  }
});

router.get("/artists/me/application-draft", authRequired, async (req, res) => {
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

router.patch("/artists/me/application-draft", authRequired, async (req, res) => {
  try {
    const currentStep = Number(req.body.currentStep || 1);
    const payload = req.body.payload || {};

    if (!Number.isInteger(currentStep) || currentStep < 1 || currentStep > 3) {
      return res.status(400).json({
        message: "Current step must be between 1 and 3"
      });
    }

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

router.post("/artists/me", authRequired, async (req, res) => {
  try {
    const { displayName, bio, termsAccepted } = req.body;
    const normalizedDisplayName = String(displayName || "").trim();
    const normalizedBio = String(bio || "").trim();

    if (!normalizedDisplayName || !normalizedBio) {
      return res.status(400).json({
        message: "Artist name and biography are required"
      });
    }

    if (!termsAccepted) {
      return res.status(400).json({
        message: "Terms and privacy policy must be accepted"
      });
    }

    const artist = await artistRepository.saveArtistApplication({
      userId: req.user.id,
      displayName: normalizedDisplayName,
      bio: normalizedBio
    });
    await artistApplicationDraftRepository.markCompleted(req.user.id);

    return res.status(200).json({
      message: "Artist profile submitted",
      artist: serializeArtistProfile(artist),
      user: serializeAuthUser(artist.user)
    });
  } catch (error) {
    console.error("Artist profile submit error:", error);
    return res.status(500).json({
      message: "Unable to submit artist profile"
    });
  }
});

module.exports = router;
