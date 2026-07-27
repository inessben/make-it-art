import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const artworkDetailPage = new URL("../pages/artworks/[id]/index.vue", import.meta.url);
const artworkEditPage = new URL("../pages/artworks/[id]/edit.vue", import.meta.url);
const legacyNestedParentPage = new URL("../pages/artworks/[id].vue", import.meta.url);

test("the artwork edit page is a renderable sibling route", async () => {
  await Promise.all([access(artworkDetailPage), access(artworkEditPage)]);

  await assert.rejects(access(legacyNestedParentPage), (error) => error?.code === "ENOENT");

  const [detailSource, editSource] = await Promise.all([
    readFile(artworkDetailPage, "utf8"),
    readFile(artworkEditPage, "utf8")
  ]);

  assert.match(detailSource, /:to="`\/artworks\/\$\{artwork\.id\}\/edit`"/);
  assert.match(editSource, /middleware:\s*\["auth",\s*"artist"\]/);
});
