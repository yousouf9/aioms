import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { toCSV, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const denied = await requirePermission(session, "reports", "view");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  switch (type) {
    case "orders":
      return exportOrders();
    case "payments":
      return exportPayments();
    case "inventory":
      return exportInventory();
    case "credit":
      return exportCredit();
    case "customers":
      return exportCustomers();
    default:
      return new Response("Invalid export type. Use: orders, payments, inventory, credit, customers", { status: 400 });
  }
}

async function exportOrders() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { select: { name: true } } } },
    },
  });

  const rows = orders.map((o) => ({
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail ?? "",
    deliveryMethod: o.deliveryMethod,
    status: o.status,
    paymentStatus: o.paymentStatus,
    source: o.source,
    items: o.items.map((i) => `${i.product.name} x${i.quantity}`).join("; "),
    subtotal: o.subtotal.toNumber(),
    deliveryFee: o.deliveryFee.toNumber(),
    total: o.total.toNumber(),
    createdAt: o.createdAt.toISOString(),
  }));

  return csvResponse(toCSV(rows), `agrohub-orders-${today()}.csv`);
}

async function exportPayments() {
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderCode: true, customerName: true } },
    },
  });

  const rows = payments.map((p) => ({
    reference: p.reference,
    source: p.source,
    amount: p.amount.toNumber(),
    method: p.method,
    status: p.status,
    valuepayRef: p.valuepayRef ?? "",
    orderCode: p.order?.orderCode ?? "",
    customerName: p.order?.customerName ?? "",
    confirmedAt: p.confirmedAt?.toISOString() ?? "",
    createdAt: p.createdAt.toISOString(),
  }));

  return csvResponse(toCSV(rows), `agrohub-payments-${today()}.csv`);
}

async function exportInventory() {
  const products = await db.product.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
      warehouseStocks: { select: { quantity: true } },
      shopStocks: { select: { quantity: true } },
    },
  });

  const rows = products.map((p) => {
    const warehouseTotal = p.warehouseStocks.reduce((s, w) => s + w.quantity, 0);
    const shopTotal = p.shopStocks.reduce((s, sh) => s + sh.quantity, 0);
    return {
      name: p.name,
      sku: p.sku ?? "",
      category: p.category.name,
      unit: p.unit,
      costPrice: p.costPrice.toNumber(),
      sellingPrice: p.sellingPrice.toNumber(),
      warehouseStock: warehouseTotal,
      shopStock: shopTotal,
      totalStock: warehouseTotal + shopTotal,
      lowStockThreshold: p.lowStockThreshold,
      isActive: p.isActive,
      isPublic: p.isPublic,
    };
  });

  return csvResponse(toCSV(rows), `agrohub-inventory-${today()}.csv`);
}

async function exportCredit() {
  const credits = await db.creditSale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  const rows = credits.map((c) => ({
    customerName: c.customer.name,
    customerPhone: c.customer.phone,
    creditType: c.creditType,
    totalAmount: c.totalAmount.toNumber(),
    paidAmount: c.paidAmount.toNumber(),
    outstanding: c.totalAmount.toNumber() - c.paidAmount.toNumber(),
    status: c.status,
    dueDate: c.dueDate?.toISOString().split("T")[0] ?? "",
    season: c.season ?? "",
    createdAt: c.createdAt.toISOString(),
  }));

  return csvResponse(toCSV(rows), `agrohub-credit-${today()}.csv`);
}

async function exportCustomers() {
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { orders: true, creditSales: true, aggregatorOffers: true } },
    },
  });

  const rows = customers.map((c) => ({
    name: c.name,
    phone: c.phone,
    email: c.email ?? "",
    address: c.address ?? "",
    roles: c.roles.join(", "),
    orders: c._count.orders,
    creditSales: c._count.creditSales,
    aggregatorOffers: c._count.aggregatorOffers,
    createdAt: c.createdAt.toISOString(),
  }));

  return csvResponse(toCSV(rows), `agrohub-customers-${today()}.csv`);
}

function today() {
  return new Date().toISOString().split("T")[0];
}
