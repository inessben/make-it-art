const fsp = require("node:fs/promises");
const path = require("node:path");
const {
  UPLOADS_ROOT,
  ensureArtworkUploadDirectory,
  buildArtworkImageUrl
} = require("../artwork-media.service");

async function putObject({ key, localPath, contentType: _contentType }) {
  await ensureArtworkUploadDirectory();
  const destination = path.join(UPLOADS_ROOT, key);
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.copyFile(localPath, destination);

  return {
    key,
    url: buildArtworkImageUrl(key)
  };
}

async function getPublicUrl(key) {
  return buildArtworkImageUrl(key);
}

async function getReadableStream(key) {
  const absolutePath = path.join(UPLOADS_ROOT, key);
  const { createReadStream } = require("node:fs");
  return createReadStream(absolutePath);
}

async function deleteObject(key) {
  if (!key) {
    return;
  }

  try {
    await fsp.unlink(path.join(UPLOADS_ROOT, key));
  } catch (_error) {
    // Ignore missing files.
  }
}

async function resolveLocalPath(key) {
  return path.join(UPLOADS_ROOT, key);
}

module.exports = {
  name: "local",
  putObject,
  getPublicUrl,
  getReadableStream,
  deleteObject,
  resolveLocalPath
};
