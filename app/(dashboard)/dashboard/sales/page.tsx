import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { POSTerminal } from "@/components/dashboard/pos-terminal";

export default async function SalesPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.sales.view) redirect("/dashboard");

  // Get open session for this cashier
  const openSession = await db.saleSession.findFirst({
    where: { cashierId: session.id, isOpen: true },
    include: {
      _count: { select: { sales: true } },
    },
  });

  // Get active products with shop stock for POS
  const products = await db.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
      shopStocks: {
        select: { quantity: true },
      },
    },
  });

  // Get recent sales (today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const recentSales = await db.sale.findMany({
    where: {
      cashierId: session.id,
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      saleItems: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  const formattedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    sellingPrice: p.sellingPrice.toNumber(),
    totalStock: p.shopStocks.reduce((sum, ss) => sum + ss.quantity, 0),
    category: p.category.name,
  }));

  const formattedSales = recentSales.map((s) => ({
    id: s.id,
    total: s.total.toNumber(),
    paymentMethod: s.paymentMethod,
    createdAt: s.createdAt,
    itemCount: s.saleItems.reduce((sum, i) => sum + i.quantity, 0),
    items: s.saleItems.map((i) => ({
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toNumber(),
      total: i.total.toNumber(),
    })),
  }));

  return (
    <POSTerminal
      session={session}
      openSession={openSession ? {
        id: openSession.id,
        openedAt: openSession.openedAt,
        salesCount: openSession._count.sales,
      } : null}
      products={formattedProducts}
      recentSales={formattedSales}
    />
  );
}
