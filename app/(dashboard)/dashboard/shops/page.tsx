import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ShopsManager } from "@/components/dashboard/shops-manager";

export default async function ShopsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [shops, warehouses] = await Promise.all([
    db.shop.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        warehouse: { select: { name: true, type: true } },
        _count: { select: { stocks: true, sales: true } },
      },
      // isActive is a scalar field on Shop — returned automatically
    }),
    db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return <ShopsManager shops={shops} warehouses={warehouses} />;
}
