import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SupplierDetail } from "@/components/dashboard/supplier-detail";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      deliveries: {
        orderBy: { deliveredAt: "desc" },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true } },
          recordedBy: { select: { name: true } },
          payments: { select: { id: true, amount: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        include: {
          delivery: { select: { id: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  if (!supplier) notFound();

  const warehouses = await db.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, costPrice: true },
  });

  const totalDelivered = supplier.deliveries.reduce((s, d) => s + d.totalCost.toNumber(), 0);
  const totalPaid = supplier.payments.reduce((s, p) => s + p.amount.toNumber(), 0);

  return (
    <SupplierDetail
      supplier={{
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        notes: supplier.notes,
        isActive: supplier.isActive,
        totalDelivered,
        totalPaid,
        balance: totalDelivered - totalPaid,
        deliveries: supplier.deliveries.map((d) => ({
          id: d.id,
          product: d.product,
          warehouse: d.warehouse,
          quantity: d.quantity,
          unitCost: d.unitCost.toNumber(),
          totalCost: d.totalCost.toNumber(),
          notes: d.notes,
          deliveredAt: d.deliveredAt.toISOString(),
          recordedBy: d.recordedBy,
          amountPaid: d.payments.reduce((s, p) => s + p.amount.toNumber(), 0),
        })),
        payments: supplier.payments.map((p) => ({
          id: p.id,
          amount: p.amount.toNumber(),
          method: p.method,
          reference: p.reference,
          notes: p.notes,
          paidAt: p.paidAt.toISOString(),
          delivery: p.delivery,
        })),
      }}
      warehouses={warehouses}
      products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, costPrice: p.costPrice.toNumber() }))}
    />
  );
}
