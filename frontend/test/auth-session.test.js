import assert from "node:assert/strict";
import test from "node:test";

import { createCurrentUserSynchronizer } from "../utils/auth-session.js";

function unauthorized() {
  return Object.assign(new Error("Not authenticated"), { statusCode: 401 });
}

test("concurrent session checks share one refresh rotation", async () => {
  const synchronizeCurrentUser = createCurrentUserSynchronizer();
  const store = { user: { id: 7 }, loading: false, initialized: false };
  const calls = [];
  let meAttempts = 0;

  const request = async (url) => {
    calls.push(url);

    if (url === "/api/auth/me" && meAttempts++ === 0) throw unauthorized();
    if (url === "/api/auth/refresh") return { ok: true };
    return { user: { id: 7, artist: { id: 42, verified: true } } };
  };

  const firstRequest = synchronizeCurrentUser(store, request);
  const secondRequest = synchronizeCurrentUser(store, request);

  assert.strictEqual(secondRequest, firstRequest);
  assert.deepEqual(await Promise.all([firstRequest, secondRequest]), [store.user, store.user]);
  assert.deepEqual(calls, ["/api/auth/me", "/api/auth/refresh", "/api/auth/me"]);
  assert.equal(store.loading, false);
  assert.equal(store.initialized, true);
});

test("a failed refresh clears a stale authenticated user", async () => {
  const synchronizeCurrentUser = createCurrentUserSynchronizer();
  const store = { user: { id: 7 }, loading: false, initialized: false };
  const calls = [];

  const request = async (url) => {
    calls.push(url);
    throw unauthorized();
  };

  await assert.rejects(synchronizeCurrentUser(store, request), /Not authenticated/);

  assert.deepEqual(calls, ["/api/auth/me", "/api/auth/refresh"]);
  assert.equal(store.user, null);
  assert.equal(store.loading, false);
  assert.equal(store.initialized, true);
});

test("a new synchronization can start after a failed request", async () => {
  const synchronizeCurrentUser = createCurrentUserSynchronizer();
  const store = { user: { id: 7 }, loading: false, initialized: false };
  let shouldFail = true;

  const request = async (url) => {
    if (shouldFail) throw Object.assign(new Error("Network unavailable"), { statusCode: 503 });
    assert.equal(url, "/api/auth/me");
    return { user: { id: 7 } };
  };

  await assert.rejects(synchronizeCurrentUser(store, request), /Network unavailable/);
  shouldFail = false;

  assert.deepEqual(await synchronizeCurrentUser(store, request), { id: 7 });
  assert.deepEqual(store.user, { id: 7 });
});
