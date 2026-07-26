const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const notificationRepository = require("../repositories/notification.repository");

const router = express.Router();

function serializeNotification(notification) {
  return {
    id: notification.id,
    type: notification.type || "system",
    title: notification.title || "Notification",
    message: notification.message || "",
    payload: notification.payload || null,
    read: Boolean(notification.readAt),
    readAt: notification.readAt,
    createdAt: notification.createdAt
  };
}

router.get("/notifications/me", authRequired, async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.listNotificationsForUser(req.user.id),
      notificationRepository.countUnreadForUser(req.user.id)
    ]);

    return res.status(200).json({
      unreadCount,
      notifications: notifications.map(serializeNotification)
    });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos notifications."
    });
  }
});

router.patch("/notifications/me/read-all", authRequired, async (req, res) => {
  try {
    const updatedCount = await notificationRepository.markAllNotificationsRead(req.user.id);

    return res.status(200).json({
      message: "Notifications marquees comme lues.",
      updatedCount
    });
  } catch (error) {
    console.error("Notifications read-all error:", error);
    return res.status(500).json({
      message: "Impossible de marquer les notifications comme lues."
    });
  }
});

router.patch("/notifications/:id(\\d+)/read", authRequired, async (req, res) => {
  const notificationId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({
      message: "Identifiant de notification invalide."
    });
  }

  try {
    const notification = await notificationRepository.markNotificationRead({
      notificationId,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification introuvable."
      });
    }

    return res.status(200).json({
      message: "Notification marquee comme lue.",
      notification: serializeNotification(notification)
    });
  } catch (error) {
    console.error("Notification read error:", error);
    return res.status(500).json({
      message: "Impossible de mettre a jour cette notification."
    });
  }
});

module.exports = router;
