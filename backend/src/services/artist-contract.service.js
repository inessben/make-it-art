const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const CONTRACT_VERSION = "make-it-art-artist-contract-v4";
const DEFAULT_CONTRACT_LANGUAGE = "en";
const SUPPORTED_CONTRACT_LANGUAGES = new Set(["en", "fr"]);
const CONTRACT_TEMPLATE_DIRECTORY = path.resolve(__dirname, "../contracts");
const CONTRACT_TIME_ZONE = process.env.CONTRACT_TIME_ZONE || "Europe/Paris";
const BUNDLED_PYTHON_PATH = path.join(
  os.homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe"
);

function normalizeContractLanguage(language) {
  const normalizedLanguage = normalizeText(language).toLowerCase();
  return SUPPORTED_CONTRACT_LANGUAGES.has(normalizedLanguage)
    ? normalizedLanguage
    : DEFAULT_CONTRACT_LANGUAGE;
}

function formatDisplayDate(date, language = DEFAULT_CONTRACT_LANGUAGE) {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: CONTRACT_TIME_ZONE
  }).format(date);
}

function formatDisplayTime(date, language = DEFAULT_CONTRACT_LANGUAGE) {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CONTRACT_TIME_ZONE
  }).format(date);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function extractArtistApplicationPayload(application) {
  return application?.payload && typeof application.payload === "object" ? application.payload : {};
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
  const contractLanguage = normalizeContractLanguage(payload.contractLanguage);
  const missingValue = contractLanguage === "fr" ? "Non renseign\u00e9" : "Not provided";
  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const displayName = normalizeText(payload.displayName);
  const legalName = [firstName, lastName].filter(Boolean).join(" ").trim() || user.username || "";
  const addressParts = [
    normalizeText(payload.addressLine1),
    normalizeText(payload.addressLine2)
  ].filter(Boolean);
  const localityParts = [
    normalizeText(payload.city),
    normalizeText(payload.region),
    normalizeText(payload.postalCode)
  ].filter(Boolean);

  return {
    contractVersion: CONTRACT_VERSION,
    contractLanguage,
    contractTimeZone: CONTRACT_TIME_ZONE,
    effectiveDate,
    effectiveDateLabel: formatDisplayDate(effectiveDate, contractLanguage),
    signatureTimeLabel: formatDisplayTime(effectiveDate, contractLanguage),
    signatureDateTimeLabel:
      formatDisplayDate(effectiveDate, contractLanguage) +
      " " +
      (contractLanguage === "fr" ? "\u00e0" : "at") +
      " " +
      formatDisplayTime(effectiveDate, contractLanguage) +
      " (" +
      CONTRACT_TIME_ZONE +
      ")",
    legalName,
    firstName,
    lastName,
    displayName,
    address: addressParts.join(", ") || missingValue,
    locality: localityParts.join(", ") || missingValue,
    country: normalizeText(payload.country) || missingValue,
    email: user.email || missingValue,
    taxId:
      normalizeText(payload.taxId) ||
      (contractLanguage === "fr" ? "Non renseign\u00e9" : "Not provided"),
    phone: user.phone || missingValue,
    artType: normalizeText(payload.artType) || missingValue,
    styles: Array.isArray(payload.styles) ? payload.styles.filter(Boolean).join(", ") : "",
    portfolioUrl: normalizeText(payload.portfolioUrl),
    socialHandle: normalizeText(payload.socialHandle),
    bio: normalizeText(payload.bio)
  };
}

function replaceFirstMatchingLine(text, patterns, replacement) {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  return text;
}

function loadContractTemplate(language) {
  return fs.readFileSync(
    path.join(CONTRACT_TEMPLATE_DIRECTORY, "artist-agreement." + language + ".txt"),
    "utf8"
  );
}

function personalizeContractTemplate(template, context) {
  const isFrench = context.contractLanguage === "fr";
  const missingValue = isFrench ? "Non renseign\u00e9" : "Not provided";
  const labels = isFrench
    ? {
        effectiveDate: "DATE D'ENTR\u00c9E EN VIGUEUR",
        legalName: "Nom l\u00e9gal",
        displayName: "Nom d'artiste/pseudonyme",
        address: "Adresse",
        locality: "Ville, D\u00e9partement, Code postal",
        email: "E-mail",
        taxId: "Num\u00e9ro d'identification fiscale (facultatif)",
        phone: "T\u00e9l\u00e9phone",
        signatureDate: "Date et heure de signature"
      }
    : {
        effectiveDate: "EFFECTIVE DATE",
        legalName: "Legal name",
        displayName: "Artist name/pseudonym",
        address: "Address",
        locality: "City, Region, Postal code",
        email: "Email",
        taxId: "Tax identification number (optional)",
        phone: "Phone",
        signatureDate: "Signature date and time"
      };

  let contractText = template.replace(/\r\n/g, "\n").trim();
  contractText = replaceFirstMatchingLine(
    contractText,
    [/^DATE D'ENTR\u00c9E EN VIGUEUR\s*:.*$/m, /^EFFECTIVE DATE\s*:.*$/m],
    labels.effectiveDate + ": " + context.effectiveDateLabel
  );
  const replacements = [
    [/^(Nom l\u00e9gal|Legal name)\s*:.*$/gm, labels.legalName + ": " + context.legalName],
    [
      /^(Nom d'artiste\/pseudonyme|Artist name\/pseudonym)\s*:.*$/gm,
      labels.displayName + ": " + (context.displayName || missingValue)
    ],
    [/^(Adresse|Address)\s*:.*$/m, labels.address + ": " + context.address],
    [
      /^(Ville,.*Code postal|City,.*Postal code)\s*:.*$/m,
      labels.locality + ": " + context.locality
    ],
    [/^(E-mail|Email)\s*:\s*_+$/gm, labels.email + ": " + context.email],
    [
      /^(Num\u00e9ro d.identification fiscale.*|Tax identification number.*)\s*:.*$/m,
      labels.taxId + ": " + context.taxId
    ]
  ];
  for (const [pattern, replacementText] of replacements)
    contractText = contractText.replace(pattern, replacementText);

  contractText = contractText.replace(
    /(Paris, France\n)(?:E-mail|Email):.*$/m,
    "$1" + (isFrench ? "E-mail" : "Email") + ": contact@makeitart.io"
  );

  const partyDetails = [
    "",
    isFrench ? "COORDONN\u00c9ES CONTRACTUELLES DE L'ARTISTE" : "ARTIST CONTRACT DETAILS",
    labels.phone + ": " + context.phone,
    (isFrench ? "Type d'art principal" : "Primary art type") + ": " + context.artType,
    (isFrench ? "Styles / sp\u00e9cialit\u00e9s" : "Styles / specialities") +
      ": " +
      (context.styles || missingValue),
    "Portfolio: " + (context.portfolioUrl || missingValue),
    (isFrench ? "R\u00e9seau social principal" : "Primary social profile") +
      ": " +
      (context.socialHandle || missingValue),
    ""
  ].join("\n");
  const preambleHeading = isFrench ? "PR\u00c9AMBULE" : "PREAMBLE";
  contractText = contractText.replace(preambleHeading, partyDetails + "\n" + preambleHeading);
  contractText = contractText.replace(
    /^(Date|Date et heure de signature|Signature date and time)\s*:.*$/gm,
    labels.signatureDate + ": " + context.signatureDateTimeLabel
  );
  return contractText;
}

function renderArtistContract({ user, payload, effectiveDate = new Date() }) {
  const context = buildContractContext({ user, payload, effectiveDate });
  const contractText = personalizeContractTemplate(
    loadContractTemplate(context.contractLanguage),
    context
  );

  return {
    contractVersion: context.contractVersion,
    contractLanguage: context.contractLanguage,
    contractText,
    context
  };
}

function resolvePythonCommand() {
  const candidates = [];

  if (process.env.PDF_PYTHON_PATH) {
    candidates.push({
      command: process.env.PDF_PYTHON_PATH,
      args: []
    });
  }

  if (fs.existsSync(BUNDLED_PYTHON_PATH)) {
    candidates.push({
      command: BUNDLED_PYTHON_PATH,
      args: []
    });
  }

  candidates.push(
    {
      command: "python3",
      args: []
    },
    {
      command: "python",
      args: []
    },
    {
      command: "py",
      args: ["-3"]
    }
  );

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.args, "--version"], {
      encoding: "utf8",
      windowsHide: true
    });

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
    })
  );
}

async function generateArtistContractPdf({
  user,
  payload,
  signatureDataUrl,
  signedAt = new Date()
}) {
  const { contractText, contractVersion, context } = renderArtistContract({
    user,
    payload,
    effectiveDate: signedAt
  });
  const backendRoot = path.resolve(__dirname, "../..");
  const tempDir = path.join(backendRoot, "tmp", "pdfs");
  const tempId = crypto.randomUUID();
  const inputPath = path.join(tempDir, `${tempId}.json`);
  const outputPath = path.join(tempDir, `${tempId}.pdf`);
  const pythonScriptPath = path.join(backendRoot, "scripts", "generate_artist_contract_pdf.py");

  await fsp.mkdir(tempDir, {
    recursive: true
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
        contractLanguage: context.contractLanguage,
        contractVersion
      },
      null,
      2
    ),
    "utf8"
  );

  const python = resolvePythonCommand();
  const result = spawnSync(
    python.command,
    [...python.args, pythonScriptPath, inputPath, outputPath],
    {
      encoding: "utf8",
      windowsHide: true
    }
  );

  if (result.status !== 0) {
    await cleanupFiles([inputPath, outputPath]);
    const details = result.stderr || result.stdout || "Unknown PDF generation error";
    throw new Error(`Unable to generate artist contract PDF: ${details.trim()}`);
  }

  const pdfBuffer = await fsp.readFile(outputPath);
  await cleanupFiles([inputPath, outputPath]);

  return {
    contractVersion,
    contractText,
    pdfBuffer,
    signedAt
  };
}

module.exports = {
  CONTRACT_VERSION,
  CONTRACT_TIME_ZONE,
  buildContractContext,
  extractArtistApplicationPayload,
  resolveContractSignedAt,
  resolvePythonCommand,
  renderArtistContract,
  generateArtistContractPdf
};
