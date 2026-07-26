export function formatAdminDate(value, locale = "fr-FR") {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatAdminDateTime(value, locale = "fr-FR") {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatAdminMoney(amount, currency = "EUR", locale = "fr-FR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format((amount || 0) / 100);
}
