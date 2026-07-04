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
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: CONTRACT_TIME_ZONE,
  }).format(date);
}

function formatDisplayTime(date) {
  return new Intl.DateTimeFormat("fr-FR", {
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
    signatureDateTimeLabel: `${formatDisplayDate(effectiveDate)} a ${formatDisplayTime(
      effectiveDate,
    )} (${CONTRACT_TIME_ZONE})`,
    legalName,
    firstName,
    lastName,
    displayName,
    address: addressParts.join(", ") || "Non renseignee",
    locality: localityParts.join(", ") || "Non renseignee",
    country: normalizeText(payload.country) || "Non renseigne",
    email: user.email || "Non renseigne",
    taxId: normalizeText(payload.taxId) || "Non renseigne",
    phone: user.phone || "Non renseigne",
    artType: normalizeText(payload.artType) || "Non renseigne",
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

  const contractText = `CONTRAT D'ARTISTE POUR LA PLATEFORME DE COMMERCE D'ART NUMERIQUE

DATE D'ENTREE EN VIGUEUR : ${context.effectiveDateLabel}

PARTIES :
MAKE IT ART
Paris, France
E-mail : contact@makeitart.io

ET
"L'ARTISTE"
Nom legal : ${context.legalName}
Nom d'artiste / pseudonyme : ${context.displayName || "Non renseigne"}
Adresse : ${context.address}
Ville, region, code postal : ${context.locality}
Pays : ${context.country}
E-mail : ${context.email}
Telephone : ${context.phone}
Numero d'identification fiscale : ${context.taxId}

PREAMBULE
CONSIDERANT que la Plateforme exploite une marketplace en ligne dediee a la creation, a l'exposition, a la promotion et a la vente d'oeuvres d'art numeriques ;
CONSIDERANT que l'Artiste cree des oeuvres originales et souhaite distribuer, promouvoir et monetiser ces oeuvres par le biais de la Plateforme ;
CONSIDERANT que les parties souhaitent etablir les conditions generales regissant cette relation ;
PAR CONSEQUENT, les parties conviennent de ce qui suit :

ARTICLE 1 - DEFINITIONS
1.1 Plateforme : la marketplace Make it Art et l'ensemble des services associes.
1.2 Oeuvre(s) : toute oeuvre creative numerique originale soumise par l'Artiste, y compris l'art digital, l'illustration, la photographie, la 3D, l'art generatif et l'animation.
1.3 NFT : tout jeton non fongible cree sur une blockchain et representant la propriete ou les droits sur une oeuvre.
1.4 Vente primaire : premiere vente d'une oeuvre ou d'un NFT par l'Artiste sur la Plateforme.
1.5 Vente secondaire : toute revente ulterieure d'une oeuvre ou d'un NFT.
1.6 Commission : frais preleves par la Plateforme sur les ventes conformement a l'article 7.

ARTICLE 2 - CHAMP D'APPLICATION DU CONTRAT
2.1 Le present contrat etablit une relation de prestataire independant. L'Artiste n'est ni salarie, ni agent, ni associe de la Plateforme.
2.2 Le present contrat est non exclusif. L'Artiste reste libre de vendre ses oeuvres sur d'autres canaux.
2.3 La Plateforme se reserve le droit d'accepter ou de refuser une candidature d'artiste selon la qualite artistique, l'adequation a la plateforme et le respect du present contrat.

ARTICLE 3 - EXIGENCES RELATIVES AUX OEUVRES ET GARANTIES
3.1 L'Artiste garantit etre l'unique createur et titulaire des droits sur les oeuvres soumises.
3.2 Les oeuvres doivent etre originales, ne pas violer les droits de tiers et ne pas contenir de contenu illicite, haineux, diffamatoire, frauduleux ou interdit.
3.3 L'Artiste doit indiquer l'usage eventuel d'outils d'IA, les elements sous licence, les editions limitees et tout element pertinent concernant les droits.

ARTICLE 4 - DROITS DE PROPRIETE INTELLECTUELLE
4.1 L'Artiste conserve l'ensemble des droits de propriete intellectuelle sur les oeuvres.
4.2 L'Artiste accorde a la Plateforme une licence non exclusive, mondiale et libre de redevances pour afficher, promouvoir, stocker et distribuer les oeuvres dans le cadre de l'exploitation de la Plateforme.
4.3 Cette licence est strictement limitee a l'exploitation et a la promotion de la Plateforme.
4.4 Les droits accordes a l'acheteur sont definis par l'Artiste via les outils de la Plateforme.

ARTICLE 5 - TARIFICATION ET CONDITIONS DE VENTE
5.1 L'Artiste fixe librement les prix de vente initiaux, les tirages et les types de licences proposes.
5.2 La Plateforme peut emettre des recommandations tarifaires sans imposer de prix, sauf pour prevenir les erreurs manifestes, les fraudes et proteger l'integrite de la marketplace.
5.3 La Plateforme agit comme intermediaire technique pour faciliter les transactions, le paiement et la livraison des fichiers.

ARTICLE 6 - REMUNERATION ET CONDITIONS DE PAIEMENT
6.1 La Plateforme preleve une commission fixe de 7 % sur les ventes primaires pendant les 12 premiers mois.
6.2 L'Artiste choisit un taux de redevance sur les ventes secondaires compris entre 5 % et 15 %.
6.3 Les frais de prestataires de paiement tiers sont deduits avant calcul de la commission.
6.4 Les paiements aux artistes sont effectues chaque semaine, sous reserve d'un seuil minimum equivalent a 50 EUR.
6.5 Les frais de gaz et les modalites blockchain sont repartis conformement aux regles de la Plateforme.

ARTICLE 7 - SERVICES ET FONCTIONNALITES DE LA PLATEFORME
7.1 Sans frais supplementaires, la Plateforme fournit une page artiste, la mise en ligne des oeuvres, l'infrastructure de paiement, un support marketing de base, le service client et le stockage securise des fichiers.
7.2 Services premium optionnels : campagnes marketing, redaction de biographie, accompagnement portfolio, services NFT et developpement de contrats intelligents peuvent etre proposes selon les tarifs communiques par la Plateforme.

ARTICLE 8 - PROTECTION ET SECURITE DES OEUVRES
8.1 La Plateforme met en oeuvre des mesures de protection du droit d'auteur telles que filigranes, retraits DMCA, controles d'acces et outils de suivi quand disponibles.
8.2 Les donnees et fichiers sont proteges par des mesures de securite raisonnables incluant chiffrement et controles d'acces.

ARTICLE 9 - MARKETING ET PROMOTION
9.1 L'Artiste autorise la Plateforme a utiliser son nom, son pseudonyme, sa biographie, son avatar et des extraits visuels des oeuvres pour des usages marketing lies a la Plateforme.

ARTICLE 10 - DECLARATIONS, GARANTIES ET INDEMNISATION
10.1 Chaque partie declare disposer de tous les pouvoirs necessaires pour conclure le present contrat et respecter les lois applicables.
10.2 L'Artiste garantit l'exactitude des informations transmises dans sa candidature :
- Nom legal : ${context.legalName}
- Nom d'artiste : ${context.displayName || "Non renseigne"}
- Type d'art principal : ${context.artType}
- Styles / specialites : ${context.styles || "Non renseignes"}
- Portfolio : ${context.portfolioUrl || "Non renseigne"}
- Reseau principal : ${context.socialHandle || "Non renseigne"}

ARTICLE 11 - LIMITATION DE RESPONSABILITE
11.1 Sauf disposition legale contraire, aucune des parties ne pourra etre tenue responsable des dommages indirects, accessoires ou consecutifs lies a l'execution du present contrat.

ARTICLE 12 - CONFIDENTIALITE ET PROTECTION DES DONNEES
12.1 La Plateforme se conforme au RGPD pour les donnees collectees aupres des artistes et clients.
12.2 Les donnees collecteess peuvent inclure nom, e-mail, adresse, numero fiscal, donnees de transaction et donnees d'usage.
12.3 Les donnees ne sont pas revendues a des tiers.

ARTICLE 13 - DUREE ET RESILIATION
13.1 Le present contrat prend effet a la date d'entree en vigueur et reste applicable jusqu'a sa resiliation conformement a ses stipulations.
13.2 La Plateforme peut refuser une candidature ou resilier le contrat selon les conditions prevues en cas de non-respect des obligations contractuelles.

ARTICLE 14 - FORCE MAJEURE
14.1 Aucune des parties n'est responsable d'un manquement cause par un evenement de force majeure echappant a son controle raisonnable.

ARTICLE 15 - CONFIDENTIALITE
15.1 Les informations confidentielles comprennent notamment les conditions financieres, les donnees de vente, l'infrastructure technique et les mesures de securite.
15.2 Chaque partie s'engage a proteger ces informations avec un niveau de diligence raisonnable.

ARTICLE 16 - DISPOSITIONS GENERALES
16.1 Le present contrat constitue l'integralite de l'accord entre les parties.
16.2 Toute modification substantielle exige un accord ecrit.
16.3 Les signatures electroniques ont la meme valeur que les signatures manuscrites.

ARTICLE 17 - DISPOSITIONS SPECIFIQUES
17.1 Pour les oeuvres vendues sous forme de NFT, l'Artiste reconnait les contraintes techniques et economiques propres a la blockchain choisie.
17.2 En cas d'oeuvres collaboratives, l'Artiste garantit disposer de l'autorite necessaire pour soumettre l'oeuvre et gerer la repartition des revenus.

PAGE DE SIGNATURE
En signant ci-dessous, les deux parties reconnaissent avoir lu et compris les termes du present contrat et acceptent d'etre liees par ceux-ci.

MAKE IT ART
Signature : Signature electronique interne
Nom en lettres majuscules : Iness BEN AISSA
Fonction : CEO of Make it Art
Date et heure de signature : ${context.signatureDateTimeLabel}

ARTISTE
Nom legal : ${context.legalName}
Nom d'artiste / pseudonyme : ${context.displayName || "Non renseigne"}
Date et heure de signature : ${context.signatureDateTimeLabel}`;

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
