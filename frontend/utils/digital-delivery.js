const STATUS = Object.freeze({
  ACTIVE: {
    label: "Actif",
    message: "La livraison numérique est disponible.",
    tone: "success"
  },
  SUSPENDED: {
    label: "Suspendu",
    message: "La livraison numérique est temporairement suspendue pendant l’examen du litige.",
    tone: "warning"
  },
  REVOKED: {
    label: "Révoqué",
    message: "La livraison numérique n’est plus disponible.",
    tone: "error"
  }
});

export function getDigitalDeliveryPresentation(status) {
  return (
    STATUS[status] || {
      label: "En préparation",
      message: "La livraison numérique n’a pas encore été finalisée.",
      tone: "pending"
    }
  );
}

export function buildCertificateDownloadUrl(orderId, certificateId) {
  if (!orderId || !certificateId) return null;

  return `/api/v1/orders/${encodeURIComponent(String(orderId))}/certificates/${encodeURIComponent(
    String(certificateId)
  )}.pdf`;
}
