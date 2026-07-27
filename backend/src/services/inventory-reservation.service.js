async function releaseReservedArtwork(transaction, reservation) {
  let released = await transaction.artwork.updateMany({
    where: {
      id: reservation.artworkId,
      licenseType: "EXCLUSIVE",
      saleStatus: "AVAILABLE",
      isSold: false,
      stockQuantity: reservation.quantity,
      reservedQuantity: reservation.quantity
    },
    data: {
      reservedQuantity: 0,
      saleStatus: "AVAILABLE",
      isSold: false
    }
  });

  // Reservations created before licence types were introduced may still
  // reference a standard artwork. Keep those checkouts recoverable.
  if (released.count === 0) {
    released = await transaction.artwork.updateMany({
      where: {
        id: reservation.artworkId,
        licenseType: { not: "EXCLUSIVE" },
        reservedQuantity: { gte: reservation.quantity }
      },
      data: { reservedQuantity: { decrement: reservation.quantity } }
    });
  }

  return released.count === 1;
}

module.exports = { releaseReservedArtwork };
