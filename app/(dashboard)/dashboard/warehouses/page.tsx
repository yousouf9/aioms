import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { WarehousesManager } from "@/components/dashboard/warehouses-manager";

export default async function WarehousesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const warehouses = await db.warehouse.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      shops: { select: { id: true, name: true, isActive: true } },
      _count: { select: { stocks: true } },
    },
  });

  return <WarehousesManager warehouses={warehouses} />;
}
