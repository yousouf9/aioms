import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Warehouse as WarehouseIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { WarehouseDetailTabs } from "@/components/dashboard/warehouse-detail-tabs";

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [warehouse, transfers, otherWarehouses, linkedShops, allProducts] =
    await Promise.all([
      db.warehouse.findUnique({
        where: { id },
        include: {
          stocks: {
            orderBy: { product: { name: "asc" } },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  sellingPrice: true,
                  lowStockThreshold: true,
                  category: { select: { name: true } },
                  imageUrl: true,
                },
              },
            },
          },
          shops: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            include: {
              stocks: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      unit: true,
                      sellingPrice: true,
                      lowStockThreshold: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.stockTransfer.findMany({
        where: {
          OR: [{ fromWarehouseId: id }, { toWarehouseId: id }],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          product: { select: { name: true, unit: true } },
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
          toShop: { select: { name: true } },
          requestedBy: { select: { name: true } },
        },
      }),
      db.warehouse.findMany({
        where: { isActive: true, NOT: { id } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      }),
      db.shop.findMany({
        where: { isActive: true, warehouseId: id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, unit: true },
      }),
    ]);

  if (!warehouse) notFound();

  const typeIsAgro = warehouse.type === "AGRO_INPUT";

  // Serialize Decimals — Prisma Decimal objects cannot be passed directly to client components
  const warehouseForClient = {
    id: warehouse.id,
    name: warehouse.name,
    type: warehouse.type,
    location: warehouse.location,
    isActive: warehouse.isActive,
    createdAt: warehouse.createdAt.toISOString(),
    stocks: warehouse.stocks.map((s) => ({
      id: s.id,
      quantity: s.quantity,
      product: {
        id: s.product.id,
        name: s.product.name,
        unit: s.product.unit,
        sellingPrice: s.product.sellingPrice.toNumber(),
        lowStockThreshold: s.product.lowStockThreshold,
        category: { name: s.product.category.name },
        imageUrl: s.product.imageUrl ?? null,
      },
    })),
    shops: warehouse.shops.map((sh) => ({
      id: sh.id,
      name: sh.name,
      location: sh.location,
      stocks: sh.stocks.map((s) => ({
        id: s.id,
        quantity: s.quantity,
        product: {
          id: s.product.id,
          name: s.product.name,
          unit: s.product.unit,
          sellingPrice: s.product.sellingPrice.toNumber(),
          lowStockThreshold: s.product.lowStockThreshold,
        },
      })),
    })),
  };

  const transfersForClient = transfers.map((t) => ({
    id: t.id,
    quantity: t.quantity,
    status: t.status,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    product: { name: t.product.name, unit: t.product.unit },
    fromWarehouse: t.fromWarehouse ? { name: t.fromWarehouse.name } : null,
    toWarehouse: t.toWarehouse ? { name: t.toWarehouse.name } : null,
    toShop: t.toShop ? { name: t.toShop.name } : null,
    requestedBy: { name: t.requestedBy.name },
  }));

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/warehouses"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-agro-dark font-body"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Warehouses
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-[8px] bg-primary/10 flex items-center justify-center shrink-0">
              <WarehouseIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-agro-dark">
                {warehouse.name}
              </h1>
              <p className="text-muted text-sm mt-1 font-body">
                {warehouse.location || "No location set"}
              </p>
              <p className="text-muted text-xs mt-1 font-body">
                Created {formatDate(warehouse.createdAt)}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "px-2 py-1 rounded-[6px] text-xs font-medium shrink-0",
              typeIsAgro ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}
          >
            {typeIsAgro ? "Agro Input" : "Grain"}
          </span>
        </div>
      </div>

      {/* Tabbed detail panel */}
      <WarehouseDetailTabs
        warehouse={warehouseForClient}
        transfers={transfersForClient}
        otherWarehouses={otherWarehouses}
        linkedShops={linkedShops}
        allProducts={allProducts}
      />
    </div>
  );
}
