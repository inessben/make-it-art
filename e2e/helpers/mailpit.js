async function pollMailpitLoginCode(
  email,
  { after = Date.now() - 5_000, timeoutMs = 30_000, intervalMs = 1_000 } = {}
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(
      `http://localhost:8025/api/v1/search?query=${encodeURIComponent(email)}`
    );

    if (!response.ok) {
      throw new Error(`Mailpit search failed for ${email} with status ${response.status}`);
    }

    const payload = await response.json();
    const matchingCode = findNewestLoginCode(payload.messages || [], email, after);

    if (matchingCode) {
      return matchingCode;
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out while waiting for the login code email for ${email}`);
}

function findNewestLoginCode(messages, email, after) {
  const relevantMessages = [...messages]
    .filter((message) => isMessageForRecipient(message, email))
    .filter((message) => getMessageTimestamp(message) >= after - 2_000)
    .sort((left, right) => getMessageTimestamp(right) - getMessageTimestamp(left));

  for (const message of relevantMessages) {
    const match = /\b(\d{6})\b/.exec(`${message.Subject || ""} ${message.Snippet || ""}`);

    if (match) {
      return match[1];
    }
  }

  return null;
}

function isMessageForRecipient(message, email) {
  return (message.To || []).some(
    (recipient) => String(recipient?.Address || "").toLowerCase() === email.toLowerCase()
  );
}

function getMessageTimestamp(message) {
  const timestamp = Date.parse(message.Created || message.Date || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

module.exports = {
  pollMailpitLoginCode
};
