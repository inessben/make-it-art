const prisma = require("../lib/prisma");

async function listOrdersForAdmin() {
  return prisma.order.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      user: true,
      items: true,
      payments: {
        orderBy: {
          checkoutVersion: "desc"
        },
        include: {
          refunds: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      }
    }
  });
}

async function findOrderDetailForAdmin(orderPublicId) {
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { publicId: orderPublicId },
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
        },
        payments: {
          orderBy: [{ checkoutVersion: "desc" }, { id: "desc" }],
          include: {
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
        },
        reservations: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            artwork: {
              include: {
                artist: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        },
        financialTransitions: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        fulfillmentTasks: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        operatorAlerts: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }]
        },
        refunds: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            requestedBy: {
              include: {
                admin: true
              }
            },
            payment: true,
            webhookEvents: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }]
            }
          }
        },
        disputes: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            payment: true,
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
        },
        invoices: {
          orderBy: [{ issuedAt: "desc" }, { id: "desc" }]
        },
        digitalEntitlements: {
          orderBy: [{ grantedAt: "desc" }, { id: "desc" }],
          include: {
            artwork: {
              include: {
                artist: {
                  include: {
                    user: true
                  }
                }
              }
            },
            user: true,
            orderItem: true
          }
        },
        ownershipCertificates: {
          orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
          include: {
            artwork: {
              include: {
                artist: {
                  include: {
                    user: true
                  }
                }
              }
            },
            user: true,
            orderItem: true
          }
        }
      }
    });

    if (!order) {
      return null;
    }

    const auditEntityFilters = [
      {
        entityType: "ORDER",
        entityId: order.publicId
      },
      ...order.fulfillmentTasks.map((task) => ({
        entityType: "FULFILLMENT_TASK",
        entityId: String(task.id)
      })),
      ...order.operatorAlerts.map((alert) => ({
        entityType: "PAYMENT_OPERATOR_ALERT",
        entityId: String(alert.id)
      })),
      ...order.disputes.map((dispute) => ({
        entityType: "DISPUTE",
        entityId: dispute.providerDisputeId
      }))
    ];

    const auditLogs =
      auditEntityFilters.length > 0
        ? await transaction.auditLog.findMany({
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
          })
        : [];

    return {
      ...order,
      auditLogs
    };
  });
}

module.exports = {
  listOrdersForAdmin,
  findOrderDetailForAdmin
};
