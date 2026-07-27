const fsp = require("node:fs/promises");
const { Readable } = require("node:stream");
const env = require("../../config/env");

function assertConfigured() {
  const { bucket, region, accessKeyId, secretAccessKey } = env.artworkMedia.s3;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3_ARTWORK_STORAGE_NOT_CONFIGURED");
  }

  return { bucket, region, accessKeyId, secretAccessKey };
}

async function getClient() {
  const config = assertConfigured();
  const { S3Client } = require("@aws-sdk/client-s3");

  return {
    client: new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    }),
    bucket: config.bucket,
    region: config.region
  };
}

async function putObject({ key, localPath, contentType }) {
  const { client, bucket } = await getClient();
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  const body = await fsp.readFile(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      ACL: "private"
    })
  );

  return {
    key,
    url: await getPublicUrl(key)
  };
}

async function getPublicUrl(key) {
  const { bucket, region, publicBaseUrl } = {
    ...assertConfigured(),
    publicBaseUrl: env.artworkMedia.s3.publicBaseUrl
  };

  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function getReadableStream(key) {
  const { client, bucket } = await getClient();
  const { GetObjectCommand } = require("@aws-sdk/client-s3");
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );

  return response.Body instanceof Readable ? response.Body : Readable.from(response.Body);
}

async function deleteObject(key) {
  if (!key) {
    return;
  }

  const { client, bucket } = await getClient();
  const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
}

module.exports = {
  name: "s3",
  putObject,
  getPublicUrl,
  getReadableStream,
  deleteObject
};
