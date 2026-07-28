import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  copyWalletAddress,
  createWalletIdempotencyKey,
  formatWalletAddress,
  getBaseScanAddressUrl,
  getCdpIdempotencyKeys,
  getEvmAddress,
  getWalletFailureCode,
  getWalletStatusLabel,
  openSecureWalletExport,
  WalletCreationTimeoutError,
  withTimeout
} from "../utils/embedded-wallet-creation.js";

describe("embedded wallet creation", () => {
  test("creates a backend-compatible idempotency key", () => {
    const key = createWalletIdempotencyKey(() => "12345678-1234-1234-1234-123456789abc");
    assert.equal(key, "wallet_12345678123412341234123456789abc");
  });

  test("uses a distinct idempotency key for EOA creation", () => {
    assert.deepEqual(getCdpIdempotencyKeys("wallet_request"), {
      authentication: "wallet_request",
      evmAccount: "wallet_request_eoa"
    });
  });

  test("uses the first detailed EVM account when one already exists", () => {
    assert.equal(
      getEvmAddress({
        evmAccountObjects: [{ address: "0x1111111111111111111111111111111111111111" }],
        evmAccounts: ["0x2222222222222222222222222222222222222222"]
      }),
      "0x1111111111111111111111111111111111111111"
    );
  });

  test("falls back to the legacy EVM account list", () => {
    assert.equal(
      getEvmAddress({ evmAccounts: ["0x2222222222222222222222222222222222222222"] }),
      "0x2222222222222222222222222222222222222222"
    );
  });

  test("formats wallet profile data without changing the address", () => {
    const address = "0x1111111111111111111111111111111111111111";
    assert.equal(formatWalletAddress(address), "0x1111…1111");
    assert.equal(getBaseScanAddressUrl(address), `https://basescan.org/address/${address}`);
    assert.equal(getWalletStatusLabel("ACTIVE"), "Active");
    assert.equal(getWalletStatusLabel("DETACHED"), "Detached");
  });

  test("covers every persisted wallet profile status", () => {
    assert.deepEqual(
      ["PENDING", "ACTIVE", "FAILED", "RETRY_REQUIRED", "DETACHED", "UNVERIFIED"].map(
        getWalletStatusLabel
      ),
      [
        "Creation in progress",
        "Active",
        "Failed",
        "Retry required",
        "Detached",
        "Email verification required"
      ]
    );
  });

  test("copies the complete public address", async () => {
    const writes = [];
    const address = "0x1111111111111111111111111111111111111111";
    assert.equal(
      await copyWalletAddress(address, { writeText: async (value) => writes.push(value) }),
      true
    );
    assert.deepEqual(writes, [address]);
  });

  test("opens secure export only after authenticating the active wallet", async () => {
    const calls = [];
    const target = {};
    const wallet = {
      id: 7,
      address: "0x1111111111111111111111111111111111111111",
      status: "ACTIVE"
    };
    const result = await openSecureWalletExport({
      wallet,
      target,
      authenticate: async (walletId) => calls.push(["authenticate", walletId]),
      createIframe: async (options) => {
        calls.push(["iframe", options.address, options.target]);
        return { cleanup() {} };
      }
    });
    assert.equal(typeof result.cleanup, "function");
    assert.deepEqual(calls, [
      ["authenticate", 7],
      ["iframe", wallet.address, target]
    ]);
  });

  test("refuses secure export for a detached wallet", async () => {
    await assert.rejects(
      openSecureWalletExport({
        wallet: {
          id: 7,
          address: "0x1111111111111111111111111111111111111111",
          status: "DETACHED"
        },
        target: {},
        authenticate: async () => {},
        createIframe: async () => ({})
      }),
      /active wallet is required/
    );
  });

  test("maps authentication and provider errors to allowed backend codes", () => {
    assert.equal(getWalletFailureCode({ name: "CustomAuthError" }), "CDP_AUTH_FAILED");
    assert.equal(
      getWalletFailureCode({ data: { code: "CDP_CONFIGURATION_MISSING" } }),
      "CDP_UNAVAILABLE"
    );
    assert.equal(getWalletFailureCode(new Error("unknown")), "CDP_CREATION_FAILED");
  });

  test("rejects a provider operation after the configured timeout", async () => {
    await assert.rejects(
      withTimeout(new Promise(() => {}), 5),
      (error) => error instanceof WalletCreationTimeoutError && error.code === "CDP_TIMEOUT"
    );
  });
});
