import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SuppliersManager } from "@/components/dashboard/suppliers-manager";
import { getPermissionsForRole } from "@/lib/permissions";

export default async function SuppliersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.suppliers.view) redirect("/dashboard");

  const suppliers = await db.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { deliveries: true } },
    },
  });

  const suppliersWithBalance = await Promise.all(
    suppliers.map(async (s) => {
      const [deliveredResult, paidResult] = await Promise.all([
        db.supplierDelivery.aggregate({ where: { supplierId: s.id }, _sum: { totalCost: true } }),
        db.supplierPayment.aggregate({ where: { supplierId: s.id }, _sum: { amount: true } }),
      ]);
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        isActive: s.isActive,
        createdAt: s.createdAt.toISOString(),
        deliveryCount: s._count.deliveries,
        totalDelivered: deliveredResult._sum.totalCost?.toNumber() ?? 0,
        totalPaid: paidResult._sum.amount?.toNumber() ?? 0,
      };
    })
  );

  return <SuppliersManager suppliers={suppliersWithBalance} />;
}
