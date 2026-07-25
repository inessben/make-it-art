function isTransactionWriteConflict(error) {
  return (
    error?.code === "P2034" ||
    error?.cause?.originalCode === "40001" ||
    error?.cause?.kind === "TransactionWriteConflict"
  );
}

function transactionRetryDelayMs(attempt) {
  return Math.min(100, 10 * 2 ** Math.max(0, attempt - 1));
}

async function waitForTransactionRetry(attempt) {
  await new Promise((resolve) => setTimeout(resolve, transactionRetryDelayMs(attempt)));
}

module.exports = {
  isTransactionWriteConflict,
  transactionRetryDelayMs,
  waitForTransactionRetry
};
