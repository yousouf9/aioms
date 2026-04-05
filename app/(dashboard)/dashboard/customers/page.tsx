import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CustomersManager } from "@/components/dashboard/customers-manager";

const PAGE_SIZE = 20;

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        _count: { select: { orders: true, creditSales: true, aggregatorOffers: true } },
      },
    }),
    db.customer.count(),
  ]);

  return (
    <CustomersManager
      initialCustomers={customers}
      initialPagination={{
        page: 1,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      }}
    />
  );
}
