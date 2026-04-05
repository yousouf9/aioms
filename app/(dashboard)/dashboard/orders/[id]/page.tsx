import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OrderDetail } from "@/components/dashboard/order-detail";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const [order, warehouses, shops] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, unit: true, imageUrl: true } } } },
        payments: true,
        customer: true,
        processedBy: { select: { name: true } },
        fulfilledFromWarehouse: { select: { name: true } },
        fulfilledFromShop: { select: { name: true } },
      },
    }),
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

  if (!order) notFound();

  const serializedOrder = {
    id: order.id,
    orderCode: order.orderCode,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    status: order.status,
    paymentStatus: order.paymentStatus,
    source: order.source,
    subtotal: order.subtotal.toNumber(),
    deliveryFee: order.deliveryFee.toNumber(),
    total: order.total.toNumber(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    processedBy: order.processedBy,
    fulfilledFromWarehouse: order.fulfilledFromWarehouse,
    fulfilledFromShop: order.fulfilledFromShop,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
          address: order.customer.address,
          notes: order.customer.notes,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      total: item.total.toNumber(),
      product: {
        name: item.product.name,
        unit: item.product.unit,
        imageUrl: item.product.imageUrl,
      },
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toNumber(),
      status: p.status,
      method: p.method,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  const mappedWarehouses = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
  }));

  const mappedShops = shops.map((s) => ({
    id: s.id,
    name: s.name,
    warehouseName: s.warehouse.name,
  }));

  return (
    <OrderDetail
      order={serializedOrder}
      warehouses={mappedWarehouses}
      shops={mappedShops}
    />
  );
}
