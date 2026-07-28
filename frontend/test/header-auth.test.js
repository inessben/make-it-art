import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerComponent = new URL("../components/TheHeader.vue", import.meta.url);
const appComponent = new URL("../app.vue", import.meta.url);
const authStore = new URL("../stores/auth.js", import.meta.url);

test("the header waits for the initial session check before rendering guest actions", async () => {
  const [headerSource, appSource, storeSource] = await Promise.all([
    readFile(headerComponent, "utf8"),
    readFile(appComponent, "utf8"),
    readFile(authStore, "utf8")
  ]);

  assert.match(storeSource, /initialized:\s*false/);
  assert.equal(
    headerSource.match(/!auth\.initialized \|\| auth\.loading/g)?.length,
    3,
    "desktop, mobile and aria-busy must share the unresolved-session guard"
  );
  assert.doesNotMatch(headerSource, /fetchCurrentUser\(/);
  assert.match(appSource, /if \(auth\.initialized \|\| auth\.loading\)/);
});
