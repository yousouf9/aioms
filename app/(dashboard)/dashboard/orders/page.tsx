import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OrdersManager } from "@/components/dashboard/orders-manager";
import type { OrderRow } from "@/components/dashboard/orders-manager";

const PAGE_SIZE = 20;

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [orders, total, warehouses, shops] = await Promise.all([
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        items: { select: { id: true } },
        customer: { select: { name: true, phone: true } },
      },
    }),
    db.order.count(),
    db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    db.shop.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, warehouse: { select: { name: true } } },
    }),
  ]);

  const initialOrders: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    status: o.status,
    paymentStatus: o.paymentStatus,
    source: o.source,
    total: o.total.toNumber(),
    itemCount: o.items.length,
    createdAt: o.createdAt.toISOString(),
  }));

  const mappedShops = shops.map((s) => ({
    id: s.id,
    name: s.name,
    warehouseName: s.warehouse.name,
  }));

  const mappedWarehouses = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
  }));

  return (
    <OrdersManager
      initialOrders={initialOrders}
      initialPagination={{ page: 1, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) || 1 }}
      warehouses={mappedWarehouses}
      shops={mappedShops}
    />
  );
}
