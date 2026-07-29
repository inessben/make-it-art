const crypto = require("node:crypto");
const argon2 = require("argon2");
const prisma = require("../lib/prisma");
const env = require("../config/env");

function assertSafeTestEnvironment() {
  if (env.nodeEnv === "production") {
    throw new Error("Payment test fixtures are forbidden in production");
  }
  if (/^(sk|rk|pk)_live_/.test(env.stripe.secretKey || "")) {
    throw new Error("Payment test fixtures are forbidden with a live Stripe key");
  }
}

async function main() {
  assertSafeTestEnvironment();

  const marker = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const password = `StripeTest!${crypto.randomBytes(6).toString("hex")}`;
  const passwordHash = await argon2.hash(password);
  const createdAt = new Date();
  const artistDisplayName = "Stripe Sandbox Artist";

  const [buyer, adminUser, artistUser] = await Promise.all([
    prisma.user.create({
      data: {
        username: `payment-buyer-${marker}`,
        email: `payment-buyer-${marker}@example.test`,
        phone: "+33600000001",
        passwordHash,
        role: "COLLECTOR",
        createdAt,
        verified: true,
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: `payment-admin-${marker}`,
        email: `payment-admin-${marker}@example.test`,
        phone: "+33600000002",
        passwordHash,
        role: "ADMIN",
        createdAt,
        verified: true,
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: `payment-artist-${marker}`,
        email: `payment-artist-${marker}@example.test`,
        phone: "+33600000003",
        passwordHash,
        role: "ARTIST",
        createdAt,
        verified: true,
        isActive: true
      }
    })
  ]);

  const [admin, artist] = await Promise.all([
    prisma.admin.create({ data: { userId: adminUser.id } }),
    prisma.artist.create({
      data: {
        userId: artistUser.id,
        displayName: artistDisplayName,
        verified: true,
        createdAt
      }
    })
  ]);
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: `Stripe sandbox artwork ${marker}`,
      description: "Development-only payment fixture",
      priceAmount: 1990,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 20,
      reservedQuantity: 0,
      createdAt
    }
  });
  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
      items: { create: { artworkId: artwork.id, quantity: 1 } }
    }
  });

  console.log(
    JSON.stringify(
      {
        warning: "Sandbox fixture only. Never use these credentials outside local development.",
        app: "http://localhost",
        mailpit: "http://localhost:8025",
        buyer: { email: buyer.email, password },
        admin: { email: adminUser.email, password, adminId: admin.id },
        artist: {
          id: artist.id,
          email: artistUser.email,
          password,
          displayName: artistDisplayName
        },
        artwork: {
          id: artwork.id,
          title: artwork.title,
          amount: 1990,
          currency: "EUR",
          artistId: artist.id
        },
        cart: { id: cart.id, path: "/cart" },
        paths: ["/login", "/cart", "/checkout", "/payment/return", "/orders"],
        routes: {
          home: "/",
          login: "/login",
          cart: "/cart",
          checkout: "/checkout",
          orders: "/orders",
          paymentReturn: "/payment/return",
          admin: "/admin",
          artistDashboard: "/artist",
          artistPublicProfile: `/artists/${artist.id}`,
          artwork: `/artworks/${artwork.id}`
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
