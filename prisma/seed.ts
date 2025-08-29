// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Seed stores
  const stores = [
    {
      name: "Brisbane CBD Store",
      email: "brisbane@yourstore.com",
    },
    {
      name: "Gold Coast Store",
      email: "goldcoast@yourstore.com",
    },
    {
      name: "Sydney Store",
      email: "sydney@yourstore.com",
    },
    {
      name: "Test Store",
      email: "test@yourstore.com",
    },
  ];

  console.log("📊 Seeding stores...");
  for (const store of stores) {
    await prisma.store.upsert({
      where: { email: store.email },
      update: store,
      create: store,
    });
    console.log(`✅ Store created/updated: ${store.name}`);
  }

  // Seed some test customers
  const customers = [
    {
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      phone: "+61400123456",
      acceptsMarketing: true,
    },
    {
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+61400789012",
      acceptsMarketing: false,
    },
  ];

  console.log("👥 Seeding customers...");
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { email: customer.email },
      update: customer,
      create: customer,
    });
    console.log(`✅ Customer created/updated: ${customer.email}`);
  }

  console.log("✅ Database seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
