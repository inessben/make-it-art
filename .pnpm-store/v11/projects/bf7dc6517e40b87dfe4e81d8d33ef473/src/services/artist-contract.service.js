const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const CONTRACT_VERSION = "make-it-art-artist-contract-v2";
const CONTRACT_TIME_ZONE = process.env.CONTRACT_TIME_ZONE || "Europe/Paris";
const BUNDLED_PYTHON_PATH = path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: CONTRACT_TIME_ZONE,
  }).format(date);
}

function formatDisplayTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CONTRACT_TIME_ZONE,
  }).format(date);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractArtistApplicationPayload(application) {
  return application?.payload && typeof application.payload === "object"
    ? application.payload
    : {};
}

function resolveContractSignedAt(application) {
  return (
    application?.contractSignedAt ||
    application?.contractAcceptedAt ||
    application?.submittedAt ||
    application?.completedAt ||
    application?.updatedAt ||
    application?.createdAt ||
    new Date()
  );
}

function buildContractContext({ user, payload, effectiveDate = new Date() }) {
  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const displayName = normalizeText(payload.displayName);
  const legalName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    "";
  const addressParts = [
    normalizeText(payload.addressLine1),
    normalizeText(payload.addressLine2),
  ].filter(Boolean);
  const localityParts = [
    normalizeText(payload.city),
    normalizeText(payload.region),
    normalizeText(payload.postalCode),
  ].filter(Boolean);

  return {
    contractVersion: CONTRACT_VERSION,
    contractTimeZone: CONTRACT_TIME_ZONE,
    effectiveDate,
    effectiveDateLabel: formatDisplayDate(effectiveDate),
    signatureTimeLabel: formatDisplayTime(effectiveDate),
    signatureDateTimeLabel: `${formatDisplayDate(effectiveDate)} at ${formatDisplayTime(
      effectiveDate,
    )} (${CONTRACT_TIME_ZONE})`,
    legalName,
    firstName,
    lastName,
    displayName,
    address: addressParts.join(", ") || "Not provided",
    locality: localityParts.join(", ") || "Not provided",
    country: normalizeText(payload.country) || "Not provided",
    email: user.email || "Not provided",
    taxId: normalizeText(payload.taxId) || "Not provided",
    phone: user.phone || "Not provided",
    artType: normalizeText(payload.artType) || "Not provided",
    styles: Array.isArray(payload.styles)
      ? payload.styles.filter(Boolean).join(", ")
      : "",
    portfolioUrl: normalizeText(payload.portfolioUrl),
    socialHandle: normalizeText(payload.socialHandle),
    bio: normalizeText(payload.bio),
  };
}

function renderArtistContract({ user, payload, effectiveDate = new Date() }) {
  const context = buildContractContext({
    user,
    payload,
    effectiveDate,
  });

  const contractText = `ARTIST AGREEMENT FOR THE DIGITAL ART MARKETPLACE

EFFECTIVE DATE: ${context.effectiveDateLabel}

PARTIES:
MAKE IT ART
Paris, France
Email: contact@makeitart.io

AND
"THE ARTIST"
Legal name: ${context.legalName}
Artist name / pseudonym: ${context.displayName || "Not provided"}
Address: ${context.address}
City, region, postal code: ${context.locality}
Country: ${context.country}
Email: ${context.email}
Phone: ${context.phone}
Tax identification number: ${context.taxId}

PREAMBLE
WHEREAS the Platform operates an online marketplace dedicated to the creation, exhibition, promotion and sale of digital artworks;
WHEREAS the Artist creates original works and wishes to distribute, promote and monetize those works through the Platform;
WHEREAS the parties wish to establish the general terms governing this relationship;
NOW, THEREFORE, the parties agree as follows:

ARTICLE 1 - DEFINITIONS
1.1 Platform: the Make It Art marketplace and all associated services.
1.2 Artwork(s): any original digital creative work submitted by the Artist, including digital art, illustration, photography, 3D, generative art and animation.
1.3 NFT: any non-fungible token created on a blockchain that represents ownership of or rights to an artwork.
1.4 Primary sale: the first sale of an artwork or NFT by the Artist on the Platform.
1.5 Secondary sale: any subsequent resale of an artwork or NFT.
1.6 Commission: fees charged by the Platform on sales in accordance with Article 6.

ARTICLE 2 - SCOPE OF THE AGREEMENT
2.1 This agreement establishes an independent contractor relationship. The Artist is not an employee, agent or partner of the Platform.
2.2 This agreement is non-exclusive. The Artist remains free to sell their artworks through other channels.
2.3 The Platform reserves the right to accept or reject an artist application based on artistic quality, suitability for the Platform and compliance with this agreement.

ARTICLE 3 - ARTWORK REQUIREMENTS AND WARRANTIES
3.1 The Artist warrants that they are the sole creator and rights holder of the submitted artworks.
3.2 Artworks must be original, must not infringe third-party rights and must not contain unlawful, hateful, defamatory, fraudulent or prohibited content.
3.3 The Artist must disclose any use of AI tools, licensed elements, limited editions and any other relevant rights information.

ARTICLE 4 - INTELLECTUAL PROPERTY RIGHTS
4.1 The Artist retains all intellectual property rights in the artworks.
4.2 The Artist grants the Platform a non-exclusive, worldwide, royalty-free license to display, promote, store and distribute the artworks for the operation of the Platform.
4.3 This license is strictly limited to operating and promoting the Platform.
4.4 Rights granted to the buyer are defined by the Artist through the Platform tools.

ARTICLE 5 - PRICING AND TERMS OF SALE
5.1 The Artist freely sets initial sale prices, edition sizes and proposed license types.
5.2 The Platform may provide pricing recommendations without imposing prices, except to prevent obvious errors or fraud and to protect marketplace integrity.
5.3 The Platform acts as a technical intermediary to facilitate transactions, payments and file delivery.

ARTICLE 6 - COMPENSATION AND PAYMENT TERMS
6.1 The Platform charges a fixed 7% commission on primary sales during the first 12 months.
6.2 The Artist selects a secondary-sale royalty rate between 5% and 15%.
6.3 Third-party payment provider fees are deducted before commission is calculated.
6.4 Artist payouts are made weekly, subject to a minimum threshold equivalent to EUR 50.
6.5 Gas fees and blockchain arrangements are allocated in accordance with Platform rules.

ARTICLE 7 - PLATFORM SERVICES AND FEATURES
7.1 At no additional cost, the Platform provides an artist page, artwork publishing, payment infrastructure, basic marketing support, customer service and secure file storage.
7.2 Optional premium services, including marketing campaigns, biography writing, portfolio guidance, NFT services and smart-contract development, may be offered at the rates communicated by the Platform.

ARTICLE 8 - ARTWORK PROTECTION AND SECURITY
8.1 The Platform implements copyright protection measures such as watermarks, DMCA takedowns, access controls and tracking tools when available.
8.2 Data and files are protected by reasonable security measures, including encryption and access controls.

ARTICLE 9 - MARKETING AND PROMOTION
9.1 The Artist authorizes the Platform to use their name, pseudonym, biography, avatar and visual excerpts of artworks for marketing related to the Platform.

ARTICLE 10 - REPRESENTATIONS, WARRANTIES AND INDEMNIFICATION
10.1 Each party represents that it has full authority to enter into this agreement and comply with applicable laws.
10.2 The Artist warrants that the information submitted in the application is accurate:
- Legal name: ${context.legalName}
- Artist name: ${context.displayName || "Not provided"}
- Primary art type: ${context.artType}
- Styles / specialties: ${context.styles || "Not provided"}
- Portfolio: ${context.portfolioUrl || "Not provided"}
- Primary social network: ${context.socialHandle || "Not provided"}

ARTICLE 11 - LIMITATION OF LIABILITY
11.1 Except where prohibited by law, neither party shall be liable for indirect, incidental or consequential damages arising from the performance of this agreement.

ARTICLE 12 - PRIVACY AND DATA PROTECTION
12.1 The Platform complies with the GDPR for data collected from artists and customers.
12.2 Collected data may include names, email addresses, postal addresses, tax identification numbers, transaction data and usage data.
12.3 Data is not sold to third parties.

ARTICLE 13 - TERM AND TERMINATION
13.1 This agreement takes effect on the effective date and remains in force until terminated in accordance with its terms.
13.2 The Platform may reject an application or terminate the agreement under the stated conditions when contractual obligations are not met.

ARTICLE 14 - FORCE MAJEURE
14.1 Neither party is liable for a failure caused by a force majeure event beyond its reasonable control.

ARTICLE 15 - CONFIDENTIALITY
15.1 Confidential information includes financial terms, sales data, technical infrastructure and security measures.
15.2 Each party agrees to protect this information with a reasonable standard of care.

ARTICLE 16 - GENERAL PROVISIONS
16.1 This agreement constitutes the entire agreement between the parties.
16.2 Any material amendment requires written agreement.
16.3 Electronic signatures have the same legal effect as handwritten signatures.

ARTICLE 17 - SPECIFIC PROVISIONS
17.1 For artworks sold as NFTs, the Artist acknowledges the technical and economic constraints of the selected blockchain.
17.2 For collaborative artworks, the Artist warrants that they have the authority required to submit the artwork and manage revenue distribution.

SIGNATURE PAGE
By signing below, both parties acknowledge that they have read and understood the terms of this agreement and agree to be bound by them.

MAKE IT ART
Signature: Internal electronic signature
Printed name: Iness BEN AISSA
Title: CEO of Make It Art
Signature date and time: ${context.signatureDateTimeLabel}

ARTIST
Legal name: ${context.legalName}
Artist name / pseudonym: ${context.displayName || "Not provided"}
Signature date and time: ${context.signatureDateTimeLabel}`;

  return {
    contractVersion: context.contractVersion,
    contractText,
    context,
  };
}

function resolvePythonCommand() {
  const candidates = [];

  if (process.env.PDF_PYTHON_PATH) {
    candidates.push({
      command: process.env.PDF_PYTHON_PATH,
      args: [],
    });
  }

  if (fs.existsSync(BUNDLED_PYTHON_PATH)) {
    candidates.push({
      command: BUNDLED_PYTHON_PATH,
      args: [],
    });
  }

  candidates.push(
    {
      command: "python3",
      args: [],
    },
    {
      command: "python",
      args: [],
    },
    {
      command: "py",
      args: ["-3"],
    },
  );

  for (const candidate of candidates) {
    const result = spawnSync(
      candidate.command,
      [...candidate.args, "--version"],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    );

    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error("Python runtime not available for contract PDF generation");
}

async function cleanupFiles(pathsToRemove) {
  await Promise.all(
    pathsToRemove.map(async (targetPath) => {
      try {
        await fsp.unlink(targetPath);
      } catch (_error) {
        // Ignore cleanup failures for temp files.
      }
    }),
  );
}

async function generateArtistContractPdf({
  user,
  payload,
  signatureDataUrl,
  signedAt = new Date(),
}) {
  const { contractText, contractVersion, context } = renderArtistContract({
    user,
    payload,
    effectiveDate: signedAt,
  });
  const backendRoot = path.resolve(__dirname, "../..");
  const tempDir = path.join(backendRoot, "tmp", "pdfs");
  const tempId = crypto.randomUUID();
  const inputPath = path.join(tempDir, `${tempId}.json`);
  const outputPath = path.join(tempDir, `${tempId}.pdf`);
  const pythonScriptPath = path.join(
    backendRoot,
    "scripts",
    "generate_artist_contract_pdf.py",
  );

  await fsp.mkdir(tempDir, {
    recursive: true,
  });

  await fsp.writeFile(
    inputPath,
    JSON.stringify(
      {
        contractText,
        signatureDataUrl,
        legalName: context.legalName,
        displayName: context.displayName,
        email: context.email,
        effectiveDateLabel: context.effectiveDateLabel,
        signatureDateTimeLabel: context.signatureDateTimeLabel,
        contractVersion,
      },
      null,
      2,
    ),
    "utf8",
  );

  const python = resolvePythonCommand();
  const result = spawnSync(
    python.command,
    [...python.args, pythonScriptPath, inputPath, outputPath],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    await cleanupFiles([inputPath, outputPath]);
    const details =
      result.stderr || result.stdout || "Unknown PDF generation error";
    throw new Error(
      `Unable to generate artist contract PDF: ${details.trim()}`,
    );
  }

  const pdfBuffer = await fsp.readFile(outputPath);
  await cleanupFiles([inputPath, outputPath]);

  return {
    contractVersion,
    contractText,
    pdfBuffer,
    signedAt,
  };
}

module.exports = {
  CONTRACT_VERSION,
  CONTRACT_TIME_ZONE,
  buildContractContext,
  extractArtistApplicationPayload,
  resolveContractSignedAt,
  renderArtistContract,
  generateArtistContractPdf,
};
