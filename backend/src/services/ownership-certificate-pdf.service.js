const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const env = require("../config/env");
const prisma = require("../lib/prisma");
const { resolvePythonCommand } = require("./artist-contract.service");

class OwnershipCertificatePdfError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OwnershipCertificatePdfError";
    this.code = code;
  }
}

function safeText(value, maximumLength = 240) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function buildOwnershipCertificatePdfPayload(certificate) {
  const snapshot = certificate?.snapshot;

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new OwnershipCertificatePdfError(
      "OWNERSHIP_CERTIFICATE_SNAPSHOT_INVALID",
      "The ownership certificate snapshot is invalid"
    );
  }

  return {
    number: safeText(certificate.certificateNumber, 80),
    status: safeText(certificate.status, 24),
    issuedAt: certificate.issuedAt,
    fingerprint: safeText(certificate.fingerprint, 128),
    sandbox: env.nodeEnv !== "production",
    purchase: {
      orderId: safeText(snapshot.orderId, 80),
      orderItemId: Number.isSafeInteger(snapshot.orderItemId) ? snapshot.orderItemId : null,
      paidAt: snapshot.paidAt || null,
      owner: safeText(snapshot.owner, 160),
      quantity: Number.isSafeInteger(snapshot.quantity) ? snapshot.quantity : 1,
      unitAmount: Number.isSafeInteger(snapshot.unitAmount) ? snapshot.unitAmount : 0,
      currency: safeText(snapshot.currency || "EUR", 3).toUpperCase()
    },
    artwork: {
      id: Number.isSafeInteger(snapshot.artworkId) ? snapshot.artworkId : null,
      title: safeText(snapshot.artworkTitle, 240),
      artistName: safeText(snapshot.artistName, 160),
      licenseType: safeText(snapshot.licenseType, 40)
    }
  };
}

async function cleanupFiles(pathsToRemove) {
  await Promise.all(
    pathsToRemove.map(async (targetPath) => {
      try {
        await fsp.unlink(targetPath);
      } catch (_error) {
        // Temporary certificate files are best-effort cleanup only.
      }
    })
  );
}

async function renderOwnershipCertificatePdf(payload) {
  const backendRoot = path.resolve(__dirname, "../..");
  const tempDir = path.join(backendRoot, "tmp", "pdfs");
  const tempId = crypto.randomUUID();
  const inputPath = path.join(tempDir, `${tempId}.certificate.json`);
  const outputPath = path.join(tempDir, `${tempId}.certificate.pdf`);
  const scriptPath = path.join(backendRoot, "scripts", "generate_ownership_certificate_pdf.py");

  await fsp.mkdir(tempDir, { recursive: true });
  await fsp.writeFile(inputPath, JSON.stringify(payload, null, 2), "utf8");

  try {
    const python = resolvePythonCommand();
    const result = spawnSync(python.command, [...python.args, scriptPath, inputPath, outputPath], {
      encoding: "utf8",
      windowsHide: true
    });

    if (result.status !== 0) {
      throw new OwnershipCertificatePdfError(
        "OWNERSHIP_CERTIFICATE_PDF_GENERATION_FAILED",
        safeText(result.stderr || result.stdout || "Ownership certificate PDF generation failed")
      );
    }

    const pdf = await fsp.readFile(outputPath);
    if (pdf.subarray(0, 4).toString("ascii") !== "%PDF") {
      throw new OwnershipCertificatePdfError(
        "OWNERSHIP_CERTIFICATE_PDF_INVALID",
        "The generated ownership certificate is not a valid PDF"
      );
    }

    return pdf;
  } finally {
    await cleanupFiles([inputPath, outputPath]);
  }
}

async function getOwnedOwnershipCertificatePdf({
  userId,
  orderPublicId,
  certificatePublicId,
  prismaClient = prisma
}) {
  const certificate = await prismaClient.ownershipCertificate.findFirst({
    where: {
      publicId: certificatePublicId,
      userId,
      order: {
        publicId: orderPublicId,
        userId
      }
    },
    select: {
      certificateNumber: true,
      status: true,
      issuedAt: true,
      fingerprint: true,
      snapshot: true
    }
  });

  if (!certificate) return null;

  const payload = buildOwnershipCertificatePdfPayload(certificate);
  const pdf = await renderOwnershipCertificatePdf(payload);
  return { number: certificate.certificateNumber, pdf };
}

module.exports = {
  OwnershipCertificatePdfError,
  buildOwnershipCertificatePdfPayload,
  getOwnedOwnershipCertificatePdf,
  renderOwnershipCertificatePdf
};
