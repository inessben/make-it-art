import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const artworkPublicationPage = new URL("../pages/artworks/new.vue", import.meta.url);

test("artwork publication refreshes an expired access session before uploading", async () => {
  const source = await readFile(artworkPublicationPage, "utf8");
  const refreshIndex = source.indexOf("await auth.fetchCurrentUser()");
  const uploadIndex = source.indexOf('$fetch("/api/artists/me/artworks"');

  assert.match(source, /const auth = useAuthStore\(\)/);
  assert.ok(refreshIndex >= 0, "publication must synchronize the artist session");
  assert.ok(uploadIndex >= 0, "the artwork upload request must remain present");
  assert.ok(refreshIndex < uploadIndex, "session synchronization must happen before the upload");
});
