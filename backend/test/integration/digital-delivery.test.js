const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { franceB2COrderFields, franceB2COrderItemFields } = require("../helpers/commerce-fixture");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest(
  "digital delivery is durable, idempotent and follows the confirmed dispute policy",
  async () => {
    const prisma = require("../../src/lib/prisma");
    const { createDefaultHandlers } = require("../../src/services/fulfillment-task.service");
    const {
      processStripeDisputeEvent
    } = require("../../src/services/dispute-finalization.service");
    const fixture = await createFixture(prisma);
    const handlers = createDefaultHandlers({
      prismaClient: prisma,
      disputeRightsPolicy: "SUSPEND_ON_OPEN"
    });

    try {
      await handlers.GRANT_DOWNLOAD_RIGHTS({ task: fixture.grantTask });
      await handlers.GRANT_DOWNLOAD_RIGHTS({ task: fixture.grantTask });
      await handlers.GENERATE_CERTIFICATE({ task: fixture.certificateTask });
      await handlers.GENERATE_CERTIFICATE({ task: fixture.certificateTask });

      assert.equal(
        await prisma.digitalEntitlement.count({ where: { orderId: fixture.order.id } }),
        1
      );
      assert.equal(
        await prisma.ownershipCertificate.count({ where: { orderId: fixture.order.id } }),
        1
      );
      let entitlement = await prisma.digitalEntitlement.findUnique({
        where: { orderItemId: fixture.orderItem.id }
      });
      const certificate = await prisma.ownershipCertificate.findUnique({
        where: { orderItemId: fixture.orderItem.id }
      });
      assert.equal(entitlement.status, "ACTIVE");
      assert.equal(certificate.status, "ACTIVE");
      assert.equal(certificate.snapshot.owner, "Delivery buyer");
      assert.match(certificate.certificateNumber, /^MIA-[A-F0-9]{20}$/);
      assert.match(certificate.fingerprint, /^[a-f0-9]{64}$/);

      // Stripe's current sandbox emits `du_` dispute identifiers. The
      // application also keeps accepting legacy `dp_` identifiers.
      const disputeId = `du_${fixture.marker}`;
      const dispute = {
        id: disputeId,
        charge: fixture.payment.providerChargeId,
        payment_intent: fixture.payment.providerPaymentId,
        status: "needs_response",
        reason: "fraudulent",
        amount: fixture.payment.amount,
        currency: "eur",
        evidence_details: { due_by: Math.floor(Date.now() / 1000) + 86400 }
      };
      await processStripeDisputeEvent({
        event: stripeEvent(`evt_open_${fixture.marker}`, "charge.dispute.created", dispute),
        prismaClient: prisma,
        disputeRightsPolicy: "SUSPEND_ON_OPEN"
      });
      const suspendTask = await prisma.fulfillmentTask.findUnique({
        where: { taskKey: `dispute:${disputeId}:SUSPEND_DOWNLOAD_RIGHTS` }
      });
      assert.ok(suspendTask);
      await runTask(prisma, suspendTask.id);
      entitlement = await prisma.digitalEntitlement.findUnique({
        where: { orderItemId: fixture.orderItem.id }
      });
      assert.equal(entitlement.status, "SUSPENDED");

      await processStripeDisputeEvent({
        event: stripeEvent(`evt_won_${fixture.marker}`, "charge.dispute.closed", {
          ...dispute,
          status: "won"
        }),
        prismaClient: prisma,
        disputeRightsPolicy: "SUSPEND_ON_OPEN"
      });
      const restoreTask = await prisma.fulfillmentTask.findUnique({
        where: { taskKey: `dispute:${disputeId}:RESTORE_DOWNLOAD_RIGHTS` }
      });
      assert.ok(restoreTask);
      await runTask(prisma, restoreTask.id);
      entitlement = await prisma.digitalEntitlement.findUnique({
        where: { orderItemId: fixture.orderItem.id }
      });
      assert.equal(entitlement.status, "ACTIVE");

      await prisma.order.update({ where: { id: fixture.order.id }, data: { status: "REFUNDED" } });
      const revokeTask = await prisma.fulfillmentTask.create({
        data: {
          orderId: fixture.order.id,
          taskType: "REVOKE_DOWNLOAD_RIGHTS",
          taskKey: `order:${fixture.order.publicId}:REVOKE_DOWNLOAD_RIGHTS`
        }
      });
      await runTask(prisma, revokeTask.id);
      const lateGrantTask = await prisma.fulfillmentTask.create({
        data: {
          orderId: fixture.order.id,
          taskType: "GRANT_DOWNLOAD_RIGHTS",
          taskKey: `order:${fixture.order.publicId}:GRANT_DOWNLOAD_RIGHTS:late`
        }
      });
      const lateGrant = await runTask(prisma, lateGrantTask.id);
      assert.equal(lateGrant.canceled, 1);

      entitlement = await prisma.digitalEntitlement.findUnique({
        where: { orderItemId: fixture.orderItem.id }
      });
      const revokedCertificate = await prisma.ownershipCertificate.findUnique({
        where: { orderItemId: fixture.orderItem.id }
      });
      assert.equal(entitlement.status, "REVOKED");
      assert.equal(revokedCertificate.status, "REVOKED");
    } finally {
      await cleanup(prisma, fixture);
      await prisma.$disconnect();
    }
  }
);

function stripeEvent(id, type, dispute) {
  return { id, type, livemode: false, data: { object: dispute } };
}

async function runTask(prisma, taskId) {
  return require("../../src/services/fulfillment-task.service").processFulfillmentBatch({
    prismaClient: prisma,
    alertSender: async () => {},
    logger: () => {},
    batchSize: 1,
    taskId
  });
}

async function createFixture(prisma) {
  const marker = randomUUID().replaceAll("-", "");
  const buyer = await prisma.user.create({
    data: {
      email: `delivery-buyer-${marker}@test.local`,
      username: "Delivery buyer",
      isActive: true,
      verified: true
    }
  });
  const artistUser = await prisma.user.create({
    data: { email: `delivery-artist-${marker}@test.local`, isActive: true, verified: true }
  });
  const artist = await prisma.artist.create({
    data: { userId: artistUser.id, displayName: "Delivery artist", verified: true }
  });
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: "Durable artwork",
      priceAmount: 1000,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 1
    }
  });
  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "a".repeat(64),
      status: "PAID",
      subtotalAmount: 1000,
      totalAmount: 1000,
      ...franceB2COrderFields({ buyer, grossAmount: 1000 }),
      currency: "EUR",
      paidAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
  const orderItem = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      artistName: artist.displayName,
      quantity: 1,
      unitAmount: 1000,
      subtotalAmount: 1000,
      ...franceB2COrderItemFields({ grossAmount: 1000 }),
      currency: "EUR"
    }
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      providerPaymentId: `pi_${marker}`,
      providerChargeId: `ch_${marker}`,
      providerStatus: "succeeded",
      amount: 1000,
      currency: "EUR",
      status: "SUCCEEDED",
      succeededAt: new Date()
    }
  });
  const grantTask = await prisma.fulfillmentTask.create({
    data: {
      orderId: order.id,
      taskType: "GRANT_DOWNLOAD_RIGHTS",
      taskKey: `order:${order.publicId}:GRANT_DOWNLOAD_RIGHTS`
    }
  });
  const certificateTask = await prisma.fulfillmentTask.create({
    data: {
      orderId: order.id,
      taskType: "GENERATE_CERTIFICATE",
      taskKey: `order:${order.publicId}:GENERATE_CERTIFICATE`
    }
  });
  return {
    marker,
    buyer,
    artistUser,
    artist,
    artwork,
    cart,
    order,
    orderItem,
    payment,
    grantTask,
    certificateTask
  };
}

async function cleanup(prisma, fixture) {
  await prisma.stripeWebhookEvent.deleteMany({ where: { paymentId: fixture.payment.id } });
  await prisma.paymentOperatorAlert.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.dispute.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.fulfillmentTask.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.digitalEntitlement.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.ownershipCertificate.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.payment.delete({ where: { id: fixture.payment.id } });
  await prisma.orderItem.delete({ where: { id: fixture.orderItem.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.artwork.delete({ where: { id: fixture.artwork.id } });
  await prisma.artist.delete({ where: { id: fixture.artist.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.buyer.id, fixture.artistUser.id] } }
  });
}
