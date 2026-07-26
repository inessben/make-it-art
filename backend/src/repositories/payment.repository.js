const prisma = require("../lib/prisma");

async function listPaymentsForAdmin() {
  return prisma.payment.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      order: {
        include: {
          user: true
        }
      }
    }
  });
}

async function findPaymentDetailForAdmin(paymentId) {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            user: {
              include: {
                admin: true,
                artist: true
              }
            },
            items: {
              orderBy: [{ id: "asc" }],
              include: {
                artwork: {
                  include: {
                    artist: {
                      include: {
                        user: true
                      }
                    },
                    category: true
                  }
                }
              }
            }
          }
        },
        refunds: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            requestedBy: {
              include: {
                admin: true
              }
            },
            webhookEvents: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }]
            }
          }
        },
        webhookEvents: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        financialTransitions: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        operatorAlerts: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        disputes: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            webhookEvents: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }]
            },
            evidenceAudits: {
              orderBy: [{ capturedAt: "desc" }, { id: "desc" }],
              include: {
                capturedBy: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return null;
    }

    const paymentEntityId = payment.providerPaymentId || String(payment.id);
    const auditEntityFilters = [
      {
        entityType: "ORDER",
        entityId: payment.order.publicId
      },
      {
        entityType: "PAYMENT",
        entityId: paymentEntityId
      },
      ...payment.webhookEvents.map((event) => ({
        entityType: "STRIPE_WEBHOOK_EVENT",
        entityId: event.eventId
      })),
      ...payment.operatorAlerts.map((alert) => ({
        entityType: "PAYMENT_OPERATOR_ALERT",
        entityId: String(alert.id)
      })),
      ...payment.disputes.map((dispute) => ({
        entityType: "DISPUTE",
        entityId: dispute.providerDisputeId
      }))
    ];

    const auditLogs = await transaction.auditLog.findMany({
      where: {
        OR: auditEntityFilters
      },
      take: 40,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          include: {
            admin: true
          }
        }
      }
    });

    return {
      ...payment,
      auditLogs
    };
  });
}

module.exports = {
  listPaymentsForAdmin,
  findPaymentDetailForAdmin
};
