const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { franceB2COrderFields } = require("../helpers/commerce-fixture");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("dispute lifecycle is idempotent, terminal and distinct from refunds", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processStripeDisputeEvent } = require("../../src/services/dispute-finalization.service");
  const { syncDisputeEvidenceAudit } = require("../../src/services/payment-operations.service");
  const marker = randomUUID().replaceAll("-", "");
  const fixture = await createFixture(prisma, marker);
  const disputeId = `dp_${marker}`;
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

  try {
    const created = stripeEvent(`evt_dp_created_${marker}`, "charge.dispute.created", dispute);
    assert.equal(
      (
        await processStripeDisputeEvent({
          event: created,
          prismaClient: prisma
        })
      ).outcome,
      "applied"
    );
    assert.equal(
      (
        await processStripeDisputeEvent({
          event: created,
          prismaClient: prisma
        })
      ).duplicate,
      true
    );
    assert.equal(await prisma.dispute.count({ where: { providerDisputeId: disputeId } }), 1);

    await processStripeDisputeEvent({
      event: stripeEvent(`evt_dp_closed_${marker}`, "charge.dispute.closed", {
        ...dispute,
        status: "won"
      }),
      prismaClient: prisma
    });
    await processStripeDisputeEvent({
      event: stripeEvent(`evt_dp_late_${marker}`, "charge.dispute.updated", dispute),
      prismaClient: prisma
    });

    const stored = await prisma.dispute.findUnique({
      where: { providerDisputeId: disputeId }
    });
    const payment = await prisma.payment.findUnique({
      where: { id: fixture.payment.id }
    });
    assert.equal(stored.status, "WON");
    assert.ok(stored.closedAt);
    assert.equal(payment.status, "SUCCEEDED");
    assert.equal(payment.refundedAmount, 0);
    assert.equal(
      await prisma.paymentOperatorAlert.count({
        where: {
          stripeObjectId: disputeId,
          code: "STRIPE_DISPUTE_OPEN",
          status: "OPEN"
        }
      }),
      0
    );

    const evidenceAudit = await syncDisputeEvidenceAudit({
      disputeId,
      requestedByUserId: fixture.user.id,
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      stripeClient: {
        disputes: {
          async retrieve(id) {
            return {
              ...dispute,
              id,
              status: "won",
              livemode: false,
              evidence_details: { has_evidence: true, submission_count: 2 },
              evidence: {
                customer_communication: "file_safe_communication",
                service_documentation: "file_safe_documentation",
                customer_email_address: "must-not-be-persisted@example.test"
              }
            };
          }
        }
      },
      expectedLivemode: false
    });
    assert.deepEqual(evidenceAudit.fileReferences, [
      "file_safe_communication",
      "file_safe_documentation"
    ]);
    assert.equal(evidenceAudit.submissionCount, 2);
    assert.equal(
      await prisma.auditLog.count({
        where: {
          userId: fixture.user.id,
          action: "STRIPE_DISPUTE_EVIDENCE_SYNCHRONIZED",
          entityId: disputeId
        }
      }),
      1
    );
    assert.doesNotMatch(JSON.stringify(evidenceAudit), /example\.test|customer_email/i);
  } finally {
    await cleanup(prisma, fixture, disputeId);
    await prisma.$disconnect();
  }
});

function stripeEvent(id, type, dispute) {
  return { id, type, livemode: false, data: { object: dispute } };
}

async function createFixture(prisma, marker) {
  const user = await prisma.user.create({
    data: {
      email: `dispute-${marker}@test.local`,
      verified: true,
      isActive: true
    }
  });
  const cart = await prisma.cart.create({ data: { userId: user.id } });
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "d".repeat(64),
      status: "PAID",
      subtotalAmount: 1000,
      totalAmount: 1000,
      ...franceB2COrderFields({ buyer: user, grossAmount: 1000 }),
      currency: "EUR",
      paidAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
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
  return { user, cart, order, payment };
}

async function cleanup(prisma, fixture, disputeId) {
  await prisma.stripeWebhookEvent.deleteMany({
    where: { stripeObjectId: disputeId }
  });
  await prisma.paymentOperatorAlert.deleteMany({
    where: { stripeObjectId: disputeId }
  });
  await prisma.auditLog.deleteMany({
    where: { userId: fixture.user.id, entityId: disputeId }
  });
  await prisma.dispute.deleteMany({ where: { providerDisputeId: disputeId } });
  await prisma.payment.delete({ where: { id: fixture.payment.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.user.delete({ where: { id: fixture.user.id } });
}
