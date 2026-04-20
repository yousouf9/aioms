import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Store, Warehouse as WarehouseIcon, AlertTriangle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, cn } from "@/lib/utils";
import { ShopStockList } from "@/components/dashboard/shop-stock-list";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const shop = await db.shop.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true, type: true } },
      stocks: {
        orderBy: { product: { name: "asc" } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              imageUrl: true,
              sellingPrice: true,
              lowStockThreshold: true,
              category: { select: { name: true } },
            },
          },
        },
      },
      _count: { select: { sales: true } },
    },
  });

  if (!shop) notFound();

  const totalUnits = shop.stocks.reduce((sum, s) => sum + s.quantity, 0);
  const distinctSkus = shop.stocks.length;
  const lowStockCount = shop.stocks.filter(
    (s) => s.quantity <= s.product.lowStockThreshold
  ).length;

  const warehouseIsAgro = shop.warehouse.type === "AGRO_INPUT";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/shops"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-agro-dark font-body"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shops
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-[8px] bg-primary/10 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-agro-dark">
              {shop.name}
            </h1>
            <p className="text-muted text-sm mt-1 font-body">
              {shop.location || "No location set"}
            </p>
            <p className="text-muted text-xs mt-1 font-body">
              Created {formatDate(shop.createdAt)}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/warehouses/${shop.warehouse.id}`}
          className="mt-4 flex items-center justify-between rounded-[8px] bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-2 group"
        >
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-4 w-4 text-muted" />
            <div>
              <p className="text-xs text-muted font-body">Linked Warehouse</p>
              <p className="text-sm font-medium text-agro-dark font-body">
                {shop.warehouse.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-0.5 rounded-[6px] text-xs font-medium",
                warehouseIsAgro
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              {warehouseIsAgro ? "Agro Input" : "Grain"}
            </span>
            <span className="text-primary text-sm group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </div>
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Units" value={totalUnits.toLocaleString()} />
        <StatCard label="Distinct Stock" value={distinctSkus.toString()} />
        <StatCard
          label="Low Stock"
          value={lowStockCount.toString()}
          highlight={lowStockCount > 0}
        />
        <StatCard label="Total Sales" value={shop._count.sales.toString()} />
      </div>

      {/* Stock list */}
      <section>
        <h2 className="font-display text-lg font-bold text-agro-dark mb-3">
          Stock in this shop
        </h2>
        <ShopStockList
          stocks={shop.stocks.map((s) => ({
            id: s.id,
            quantity: s.quantity,
            product: {
              id: s.product.id,
              name: s.product.name,
              unit: s.product.unit,
              sellingPrice: s.product.sellingPrice.toNumber(),
              lowStockThreshold: s.product.lowStockThreshold,
              category: { name: s.product.category.name },
            },
          }))}
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {highlight && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        <p className="text-xs text-muted font-body uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "font-display text-2xl font-bold mt-2",
          highlight ? "text-amber-600" : "text-agro-dark"
        )}
      >
        {value}
      </p>
    </div>
  );
}

