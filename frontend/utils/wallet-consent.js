export function getWalletConsentState({ verified, consent }) {
  if (!verified) {
    return "unverified";
  }

  if (consent?.accepted === true && !consent.revokedAt) {
    return "accepted";
  }

  if (consent?.accepted === false || consent?.revokedAt) {
    return "declined";
  }

  return "undecided";
}
