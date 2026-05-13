import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPermissionsForRole } from "@/lib/permissions";
import { AuditTrailView } from "@/components/dashboard/audit-trail";

const PAGE_SIZE = 40;

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.reports.view) redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const type = params.type ?? "";
  const productQuery = params.product ?? "";

  const where: Record<string, unknown> = {};
  if (type === "IN" || type === "OUT" || type === "ADJUSTMENT") where.type = type;
  if (productQuery) {
    where.product = { name: { contains: productQuery, mode: "insensitive" } };
  }

  const [transactions, total] = await Promise.all([
    db.stockTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: { select: { name: true, unit: true } },
        user: { select: { name: true } },
      },
    }),
    db.stockTransaction.count({ where }),
  ]);

  const [warehouses, shops] = await Promise.all([
    db.warehouse.findMany({ select: { id: true, name: true } }),
    db.shop.findMany({ select: { id: true, name: true } }),
  ]);

  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));
  const shopMap = Object.fromEntries(shops.map((s) => [s.id, s.name]));

  const serialized = transactions.map((t) => ({
    id: t.id,
    type: t.type as "IN" | "OUT" | "ADJUSTMENT",
    quantity: t.quantity,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    product: { name: t.product.name, unit: t.product.unit },
    user: { name: t.user.name },
    location: t.warehouseId
      ? `${warehouseMap[t.warehouseId] ?? "Warehouse"} (warehouse)`
      : t.shopId
      ? `${shopMap[t.shopId] ?? "Shop"} (shop)`
      : "—",
  }));

  return (
    <AuditTrailView
      transactions={serialized}
      pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) }}
      filters={{ type, product: productQuery }}
    />
  );
}
