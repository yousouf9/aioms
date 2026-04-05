import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CreditManager } from "@/components/dashboard/credit-manager";

export default async function CreditPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const PAGE_SIZE = 20;

  const [credits, total, warehouses, shops] = await Promise.all([
    db.creditSale.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
        _count: { select: { payments: true } },
      },
    }),
    db.creditSale.count(),
    db.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // Auto-mark overdue
  const now = new Date();
  const overdueIds = credits
    .filter((c) => c.status === "ACTIVE" && c.dueDate && c.dueDate < now)
    .map((c) => c.id);
  if (overdueIds.length > 0) {
    await db.creditSale.updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } });
    credits.forEach((c) => {
      if (overdueIds.includes(c.id)) c.status = "OVERDUE" as typeof c.status;
    });
  }

  const serialized = credits.map((c) => ({
    ...c,
    totalAmount: c.totalAmount.toNumber(),
    paidAmount: c.paidAmount.toNumber(),
    dueDate: c.dueDate?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    items: c.items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice.toNumber(),
      total: i.total.toNumber(),
    })),
    payments: c.payments.map((p) => ({
      ...p,
      amount: p.amount.toNumber(),
      createdAt: p.createdAt.toISOString(),
    })),
  }));

  return (
    <CreditManager
      initialCredits={serialized}
      initialPagination={{ page: 1, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) || 1 }}
      warehouses={warehouses}
      shops={shops}
    />
  );
}
