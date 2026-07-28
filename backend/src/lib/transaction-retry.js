function isTransactionWriteConflict(error) {
  return (
    error?.code === "P2034" ||
    error?.meta?.code === "40001" ||
    error?.cause?.originalCode === "40001" ||
    error?.cause?.kind === "TransactionWriteConflict" ||
    error?.message?.includes(
      "could not serialize access due to read/write dependencies among transactions"
    )
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
