const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { Prisma } = require("@prisma/client");
const env = require("../config/env");
const prisma = require("../lib/prisma");
const {
  extractArtistApplicationPayload,
  resolvePythonCommand
} = require("./artist-contract.service");

const INVOICEABLE_ORDER_STATUSES = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

class InvoiceError extends Error {
  constructor(code, message, { retryable = true, canceled = false } = {}) {
    super(message);
    this.name = "InvoiceError";
    this.code = code;
    this.retryable = retryable;
    this.canceled = canceled;
  }
}

function safeText(value, maximumLength = 240) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function invoiceIssuerSnapshot() {
  const issuer = env.commerce.issuer;
  const required = [
    "legalName",
    "addressLine1",
    "postalCode",
    "city",
    "country",
    "registrationId",
    "vatId",
    "email"
  ];
  const missing = required.filter((field) => !safeText(issuer[field]));

  if (missing.length > 0) {
    throw new InvoiceError(
      "INVOICE_ISSUER_INCOMPLETE",
      "The legal invoice issuer configuration is incomplete",
      { retryable: false }
    );
  }

  return {
    legalName: safeText(issuer.legalName),
    address: {
      line1: safeText(issuer.addressLine1),
      ...(safeText(issuer.addressLine2) ? { line2: safeText(issuer.addressLine2) } : {}),
      postalCode: safeText(issuer.postalCode),
      city: safeText(issuer.city),
      country: safeText(issuer.country, 2).toUpperCase()
    },
    registrationId: safeText(issuer.registrationId),
    vatId: safeText(issuer.vatId),
    email: safeText(issuer.email, 254).toLowerCase(),
    merchantOfRecord: true,
    sandbox: env.nodeEnv !== "production"
  };
}

function invoicePrefix(type) {
  return type === "SALE" ? "VTE" : "COM";
}

function invoiceYear(date) {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Europe/Paris",
      year: "numeric"
    }).format(date)
  );
}

function invoiceNumber(type, year, sequence) {
  return `MIA-${invoicePrefix(type)}-${year}-${String(sequence).padStart(6, "0")}`;
}

function invoiceFingerprint(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

async function createInvoiceRecord({ prismaClient, input, now }) {
  const uniqueWhere = {
    orderId_type_recipientReference: {
      orderId: input.orderId,
      type: input.type,
      recipientReference: input.recipientReference
    }
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await prismaClient.$transaction(
        async (transaction) => {
          const existing = await transaction.invoice.findUnique({ where: uniqueWhere });
          if (existing) return existing;

          const year = invoiceYear(now);
          const sequenceKey = `${input.type}:${year}`;
          const sequence = await transaction.invoiceSequence.upsert({
            where: { key: sequenceKey },
            create: { key: sequenceKey, currentValue: 1 },
            update: { currentValue: { increment: 1 } }
          });
          const number = invoiceNumber(input.type, year, sequence.currentValue);
          const fingerprint = invoiceFingerprint({
            ...input,
            number,
            issuedAt: now.toISOString()
          });

          return transaction.invoice.create({
            data: {
              ...input,
              number,
              fingerprint,
              issuedAt: now
            }
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error?.code !== "P2034" || attempt === 5) throw error;
    }
  }
}

async function cleanupFiles(pathsToRemove) {
  await Promise.all(
    pathsToRemove.map(async (targetPath) => {
      try {
        await fsp.unlink(targetPath);
      } catch (_error) {
        // Temporary invoice files are best-effort cleanup only.
      }
    })
  );
}

async function renderInvoicePdf(invoice) {
  const backendRoot = path.resolve(__dirname, "../..");
  const tempDir = path.join(backendRoot, "tmp", "pdfs");
  const tempId = crypto.randomUUID();
  const inputPath = path.join(tempDir, `${tempId}.invoice.json`);
  const outputPath = path.join(tempDir, `${tempId}.invoice.pdf`);
  const scriptPath = path.join(backendRoot, "scripts", "generate_invoice_pdf.py");

  await fsp.mkdir(tempDir, { recursive: true });
  await fsp.writeFile(
    inputPath,
    JSON.stringify(
      {
        number: invoice.number,
        type: invoice.type,
        issuedAt: invoice.issuedAt,
        currency: invoice.currency,
        issuer: invoice.issuerSnapshot,
        recipient: invoice.recipientSnapshot,
        lines: invoice.lineItems,
        subtotalAmount: invoice.subtotalAmount,
        discountAmount: invoice.discountAmount,
        netAmount: invoice.netAmount,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        fingerprint: invoice.fingerprint
      },
      null,
      2
    ),
    "utf8"
  );

  const python = resolvePythonCommand();
  const result = spawnSync(python.command, [...python.args, scriptPath, inputPath, outputPath], {
    encoding: "utf8",
    windowsHide: true
  });

  if (result.status !== 0) {
    await cleanupFiles([inputPath, outputPath]);
    throw new InvoiceError(
      "INVOICE_PDF_GENERATION_FAILED",
      safeText(result.stderr || result.stdout || "Invoice PDF generation failed")
    );
  }

  const pdf = await fsp.readFile(outputPath);
  await cleanupFiles([inputPath, outputPath]);
  return pdf;
}

async function ensureInvoicePdf(invoice, prismaClient) {
  if (invoice.pdf) return invoice;
  const pdf = await renderInvoicePdf(invoice);
  return prismaClient.invoice.update({
    where: { id: invoice.id },
    data: { pdf }
  });
}

function saleRecipient(order) {
  const billing = order.billingSnapshot;
  if (!billing?.name || !billing?.address || billing.address.country !== "FR") {
    throw new InvoiceError(
      "SALE_INVOICE_RECIPIENT_INCOMPLETE",
      "The order billing snapshot is incomplete",
      { retryable: false }
    );
  }
  return {
    customerType: "B2C",
    name: safeText(billing.name),
    email: safeText(billing.email || order.user.email, 254).toLowerCase(),
    address: {
      line1: safeText(billing.address.line1),
      ...(safeText(billing.address.line2) ? { line2: safeText(billing.address.line2) } : {}),
      postalCode: safeText(billing.address.postalCode),
      city: safeText(billing.address.city),
      country: "FR"
    }
  };
}

function saleInvoiceInput(order) {
  if (order.netAmount === undefined && order.subtotalExcludingTaxAmount === undefined) {
    throw new InvoiceError("SALE_INVOICE_TOTALS_MISSING", "The order tax snapshot is incomplete", {
      retryable: false
    });
  }
  const netAmount = order.subtotalExcludingTaxAmount;
  if (netAmount + order.taxAmount !== order.totalAmount) {
    throw new InvoiceError(
      "SALE_INVOICE_TOTALS_MISMATCH",
      "The order tax totals are inconsistent",
      {
        retryable: false
      }
    );
  }
  const lineTotals = order.items.reduce(
    (totals, item) => ({
      subtotalAmount: totals.subtotalAmount + item.subtotalAmount,
      discountAmount: totals.discountAmount + item.discountAmount,
      netAmount: totals.netAmount + item.netAmount,
      taxAmount: totals.taxAmount + item.taxAmount
    }),
    { subtotalAmount: 0, discountAmount: 0, netAmount: 0, taxAmount: 0 }
  );
  if (
    lineTotals.subtotalAmount !== order.subtotalAmount ||
    lineTotals.discountAmount !== order.discountAmount ||
    lineTotals.netAmount !== netAmount ||
    lineTotals.taxAmount !== order.taxAmount
  ) {
    throw new InvoiceError(
      "SALE_INVOICE_LINE_TOTALS_MISMATCH",
      "The order lines do not match the invoice totals",
      { retryable: false }
    );
  }

  return {
    type: "SALE",
    orderId: order.id,
    recipientReference: `buyer:${order.userId}`,
    issuerSnapshot: invoiceIssuerSnapshot(),
    recipientSnapshot: saleRecipient(order),
    lineItems: order.items.map((item) => ({
      reference: `artwork:${item.artworkId}`,
      description: safeText(item.artworkTitle),
      artistName: safeText(item.artistName),
      licenseType: item.licenseType,
      quantity: item.quantity,
      unitGrossAmount: item.unitAmount,
      subtotalAmount: item.subtotalAmount,
      discountAmount: item.discountAmount,
      netAmount: item.netAmount,
      taxRateBps: item.taxRateBps,
      taxAmount: item.taxAmount,
      totalAmount: item.subtotalAmount - item.discountAmount
    })),
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    netAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    currency: order.currency
  };
}

async function issueSaleInvoice({ task, prismaClient = prisma, now = new Date() }) {
  const order = await prismaClient.order.findUnique({
    where: { id: task.orderId },
    include: {
      user: { select: { email: true } },
      items: { orderBy: { id: "asc" } }
    }
  });

  if (!order || !INVOICEABLE_ORDER_STATUSES.has(order.status)) {
    throw new InvoiceError("SALE_INVOICE_NOT_READY", "The order is not ready for sale invoicing", {
      retryable: Boolean(order),
      canceled: !order
    });
  }

  const invoice = await createInvoiceRecord({
    prismaClient,
    input: saleInvoiceInput(order),
    now
  });
  const completed = await ensureInvoicePdf(invoice, prismaClient);
  return { effectReference: `invoice:${completed.publicId}` };
}

function artistRecipient(artist) {
  const payload = extractArtistApplicationPayload(artist.user.artistApplicationDraft);
  const legalName = [safeText(payload.firstName), safeText(payload.lastName)]
    .filter(Boolean)
    .join(" ");
  const required = [
    legalName,
    payload.addressLine1,
    payload.postalCode,
    payload.city,
    payload.country,
    payload.taxId,
    artist.user.email
  ];
  if (required.some((value) => !safeText(value))) {
    throw new InvoiceError(
      "COMMISSION_INVOICE_RECIPIENT_INCOMPLETE",
      "The artist legal billing profile is incomplete",
      { retryable: false }
    );
  }
  return {
    name: legalName,
    displayName: safeText(artist.displayName),
    email: safeText(artist.user.email, 254).toLowerCase(),
    taxId: safeText(payload.taxId),
    address: {
      line1: safeText(payload.addressLine1),
      ...(safeText(payload.addressLine2) ? { line2: safeText(payload.addressLine2) } : {}),
      postalCode: safeText(payload.postalCode),
      city: safeText(payload.city),
      country: safeText(payload.country, 64)
    }
  };
}

function commissionTaxAmount(netAmount) {
  return Math.round((netAmount * env.commerce.commissionVatRateBps) / 10000);
}

async function issueCommissionInvoices({ task, prismaClient = prisma, now = new Date() }) {
  if (!env.commerce.commissionInvoicingEnabled) {
    throw new InvoiceError(
      "COMMISSION_PHASE_DISABLED",
      "Commission invoicing is disabled for the initial launch",
      { retryable: false, canceled: true }
    );
  }

  const order = await prismaClient.order.findUnique({
    where: { id: task.orderId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          artwork: {
            include: {
              artist: {
                include: {
                  user: { include: { artistApplicationDraft: true } }
                }
              }
            }
          }
        }
      }
    }
  });
  if (!order || !INVOICEABLE_ORDER_STATUSES.has(order.status)) {
    throw new InvoiceError(
      "COMMISSION_INVOICE_NOT_READY",
      "The order is not ready for commission invoicing",
      { retryable: Boolean(order), canceled: !order }
    );
  }

  const grouped = new Map();
  for (const item of order.items) {
    const artist = item.artwork.artist;
    const group = grouped.get(artist.id) || { artist, items: [] };
    group.items.push(item);
    grouped.set(artist.id, group);
  }

  const references = [];
  for (const { artist, items } of grouped.values()) {
    const netAmount = items.reduce((total, item) => total + item.commissionAmount, 0);
    const lineItems = items.map((item) => {
      const taxAmount = commissionTaxAmount(item.commissionAmount);
      return {
        reference: `artwork:${item.artworkId}`,
        description: `Commission ${item.commissionRateBps / 100} % - ${safeText(
          item.artworkTitle
        )}`,
        quantity: item.quantity,
        commissionBasisAmount: item.netAmount,
        commissionRateBps: item.commissionRateBps,
        netAmount: item.commissionAmount,
        taxRateBps: env.commerce.commissionVatRateBps,
        taxAmount,
        totalAmount: item.commissionAmount + taxAmount
      };
    });
    const taxAmount = lineItems.reduce((total, item) => total + item.taxAmount, 0);
    const input = {
      type: "COMMISSION",
      orderId: order.id,
      recipientReference: `artist:${artist.id}`,
      issuerSnapshot: invoiceIssuerSnapshot(),
      recipientSnapshot: artistRecipient(artist),
      lineItems,
      subtotalAmount: netAmount,
      discountAmount: 0,
      netAmount,
      taxAmount,
      totalAmount: netAmount + taxAmount,
      currency: order.currency
    };
    const invoice = await createInvoiceRecord({ prismaClient, input, now });
    const completed = await ensureInvoicePdf(invoice, prismaClient);
    references.push(completed.publicId);
  }

  return { effectReference: `commission-invoices:${references.length}` };
}

async function getOwnedSaleInvoicePdf({ userId, orderPublicId, invoicePublicId }) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      publicId: invoicePublicId,
      type: "SALE",
      order: { publicId: orderPublicId, userId }
    },
    select: { number: true, pdf: true }
  });
  if (!invoice?.pdf) return null;
  return { number: invoice.number, pdf: Buffer.from(invoice.pdf) };
}

module.exports = {
  InvoiceError,
  commissionTaxAmount,
  getOwnedSaleInvoicePdf,
  invoiceFingerprint,
  invoiceIssuerSnapshot,
  invoiceNumber,
  invoiceYear,
  issueCommissionInvoices,
  issueSaleInvoice,
  saleInvoiceInput
};
