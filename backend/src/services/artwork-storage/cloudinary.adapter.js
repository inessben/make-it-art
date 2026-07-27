const env = require("../../config/env");

function assertConfigured() {
  const { cloudName, apiKey, apiSecret } = env.artworkMedia.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_ARTWORK_STORAGE_NOT_CONFIGURED");
  }

  return { cloudName, apiKey, apiSecret, folder: env.artworkMedia.cloudinary.folder };
}

function getCloudinary() {
  const config = assertConfigured();
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true
  });

  return { cloudinary, folder: config.folder };
}

async function putObject({ key, localPath, contentType: _contentType }) {
  const { cloudinary, folder } = getCloudinary();
  const publicId = `${folder}/${key.replace(/\.[^.]+$/, "")}`.replace(/\/+/g, "/");

  const result = await cloudinary.uploader.upload(localPath, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image"
  });

  return {
    key: result.public_id,
    url: result.secure_url
  };
}

async function getPublicUrl(key) {
  const { cloudinary } = getCloudinary();
  return cloudinary.url(key, { secure: true });
}

async function getReadableStream(key) {
  const url = await getPublicUrl(key);
  const response = await fetch(url);

  if (!response.ok || !response.body) {
    throw new Error("CLOUDINARY_OBJECT_NOT_FOUND");
  }

  const { Readable } = require("node:stream");
  return Readable.fromWeb(response.body);
}

async function deleteObject(key) {
  if (!key) {
    return;
  }

  const { cloudinary } = getCloudinary();
  await cloudinary.uploader.destroy(key, { resource_type: "image" });
}

module.exports = {
  name: "cloudinary",
  putObject,
  getPublicUrl,
  getReadableStream,
  deleteObject
};
