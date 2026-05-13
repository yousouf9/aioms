import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TransfersManager } from "@/components/dashboard/transfers-manager";

export default async function TransfersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const PAGE_SIZE = 25;

  const [transfers, total, warehouses, shops] = await Promise.all([
    db.stockTransfer.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        product: { select: { name: true, unit: true } },
        fromWarehouse: { select: { name: true } },
        fromShop: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        toShop: { select: { name: true } },
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
    }),
    db.stockTransfer.count(),
    db.warehouse.findMany({ where: { isActive: true }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } }),
    db.shop.findMany({ where: { isActive: true }, select: { id: true, name: true, warehouseId: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <TransfersManager
      initialTransfers={transfers.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      }))}
      initialPagination={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }}
      warehouses={warehouses}
      shops={shops}
      canCreate={session.role === "SUPER_ADMIN" || session.role === "MANAGER"}
    />
  );
}
