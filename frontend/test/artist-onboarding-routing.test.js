import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const accountSidebar = new URL("../components/account/AccountSettingsSidebar.vue", import.meta.url);
const accountSettings = new URL("../components/account/AccountSettingsForms.vue", import.meta.url);
const homepage = new URL("../pages/index.vue", import.meta.url);

test("artist onboarding is offered from the homepage instead of a collector dashboard", async () => {
  const [sidebarSource, settingsSource, homepageSource] = await Promise.all([
    readFile(accountSidebar, "utf8"),
    readFile(accountSettings, "utf8"),
    readFile(homepage, "utf8")
  ]);

  assert.doesNotMatch(sidebarSource, /label:\s*"Become an artist"/);
  assert.match(
    settingsSource,
    /!auth\.isAdmin\s*&&\s*\(auth\.isArtist\s*\|\|\s*auth\.hasArtistApplication\)/
  );
  assert.match(
    homepageSource,
    /<NuxtLink\s+to="\/become-artist"\s+class="homepage__collective-cta">/
  );
});

test("artists and users with an existing application keep their dashboard entry", async () => {
  const sidebarSource = await readFile(accountSidebar, "utf8");

  assert.match(sidebarSource, /label:\s*"Artist dashboard"/);
  assert.match(sidebarSource, /label:\s*"Artist application"/);
  assert.match(sidebarSource, /label:\s*"Update artist application"/);
});
