import "dotenv/config";
import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const MANAGER_PERMISSIONS = {
  orders: { view: true, create: true, update: true, delete: false },
  sales: { view: true, create: true, update: true, delete: false },
  payments: { view: true, create: true, update: true, delete: false },
  inventory: { view: true, create: true, update: true, delete: true },
  warehouses: { view: true, create: true, update: true, delete: true },
  credit: { view: true, create: true, update: true, delete: false },
  aggregators: { view: true, create: true, update: true, delete: false },
  customers: { view: true, create: true, update: true, delete: false },
  staff: { view: true, create: false, update: false, delete: false },
  announcements: { view: true, create: true, update: true, delete: true },
  reports: { view: true, create: false, update: false, delete: false },
  settings: { view: true, create: false, update: true, delete: false },
  attendance: { view: true, create: true, update: false, delete: false },
};

const CASHIER_PERMISSIONS = {
  orders: { view: true, create: true, update: true, delete: false },
  sales: { view: true, create: true, update: false, delete: false },
  payments: { view: true, create: true, update: false, delete: false },
  inventory: { view: true, create: false, update: false, delete: false },
  warehouses: { view: true, create: false, update: false, delete: false },
  credit: { view: true, create: true, update: false, delete: false },
  aggregators: { view: false, create: false, update: false, delete: false },
  customers: { view: true, create: true, update: true, delete: false },
  staff: { view: false, create: false, update: false, delete: false },
  announcements: { view: true, create: false, update: false, delete: false },
  reports: { view: false, create: false, update: false, delete: false },
  settings: { view: false, create: false, update: false, delete: false },
  attendance: { view: true, create: true, update: false, delete: false },
};

async function main() {
  console.log("Seeding Agro Hub database...");

  // ─── System Roles ────────────────────────────────────────────
  const systemRoles = [
    { name: "SUPER_ADMIN", label: "Super Admin", description: "Full access to everything", permissions: Prisma.JsonNull, color: "bg-purple-50 text-purple-600", sortOrder: 0 },
    { name: "MANAGER", label: "Manager", description: "Manages day-to-day operations, inventory, credit, and aggregators", permissions: MANAGER_PERMISSIONS, color: "bg-blue-50 text-blue-600", sortOrder: 1 },
    { name: "CASHIER", label: "Cashier", description: "Handles POS sales, orders, and payments", permissions: CASHIER_PERMISSIONS, color: "bg-green-50 text-green-600", sortOrder: 2 },
  ];

  for (const role of systemRoles) {
    await db.role.upsert({
      where: { name: role.name },
      update: {},
      create: { ...role, isSystem: true },
    });
  }
  console.log("  Roles seeded (3 roles)");

  // ─── Default SUPER_ADMIN ──────────────────────────────────
  const adminEmail = "admin@agrohub.com";
  const existing = await db.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash("Admin@1234", 12);
    await db.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash,
        roleName: "SUPER_ADMIN",
      },
    });
    console.log(`  SUPER_ADMIN created: ${adminEmail} / Admin@1234`);
  } else {
    console.log(`  Admin already exists: ${adminEmail}`);
  }

  // ─── Default Site Settings ────────────────────────────────
  await db.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "Agro Hub",
      phone: "+234 000 000 0000",
      whatsapp: "2340000000000",
      email: "info@agrohub.com",
      address: "Lafia, Nasarawa State, Nigeria",
      aboutText: "Your trusted source for quality agricultural supplies — herbicides, fertilizers, machinery, seeds, and grains.",
      deliveryFee: 0,
      openingHours: {
        "Mon-Fri": "8:00 AM - 6:00 PM",
        "Sat": "8:00 AM - 4:00 PM",
        "Sun": "Closed",
      },
    },
  });
  console.log("  Site settings initialized");

  // ─── Product Categories ───────────────────────────────────
  const categories = [
    { name: "Herbicides", description: "Weed control chemicals including glyphosate, paraquat, and selective herbicides", sortOrder: 0 },
    { name: "Pesticides", description: "Insecticides, fungicides, and crop protection products", sortOrder: 1 },
    { name: "Fertilizers", description: "Organic and chemical fertilizers for soil enrichment", sortOrder: 2 },
    { name: "Seeds", description: "Certified crop seeds for planting", sortOrder: 3 },
    { name: "Grains", description: "Rice, maize, sorghum, and other commodity grains", sortOrder: 4 },
    { name: "Machinery", description: "Tillers, cultivators, and power equipment for farming", sortOrder: 5 },
    { name: "Sprayers & Equipment", description: "Pressure sprayers, knapsack sprayers, and field tools", sortOrder: 6 },
  ];

  for (const cat of categories) {
    await db.productCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log("  Product categories seeded (7 categories)");

  // ─── Warehouses ───────────────────────────────────────────
  const warehouses = [
    { name: "Agro Input Warehouse 1", type: "AGRO_INPUT" as const, location: "Lafia Main" },
    { name: "Agro Input Warehouse 2", type: "AGRO_INPUT" as const, location: "Lafia East" },
    { name: "Grain Warehouse 1", type: "GRAIN" as const, location: "Lafia Main" },
    { name: "Grain Warehouse 2", type: "GRAIN" as const, location: "Lafia East" },
  ];

  const warehouseRecords = [];
  for (const wh of warehouses) {
    const record = await db.warehouse.create({ data: wh });
    warehouseRecords.push(record);
  }
  console.log("  Warehouses seeded (4 warehouses)");

  // ─── Shops ────────────────────────────────────────────────
  const shops = [
    { name: "Main Shop", warehouseId: warehouseRecords[0].id, location: "Lafia Central Market" },
    { name: "East Branch", warehouseId: warehouseRecords[1].id, location: "Lafia East Market" },
  ];

  for (const shop of shops) {
    await db.shop.create({ data: shop });
  }
  console.log("  Shops seeded (2 shops)");

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
