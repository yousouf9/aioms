import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Store, Warehouse as WarehouseIcon, AlertTriangle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

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
        <StatCard label="Distinct SKUs" value={distinctSkus.toString()} />
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

        {shop.stocks.length === 0 ? (
          <EmptyState text="No stock yet. Add stock from the Inventory page." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-[12px] border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-body font-medium text-muted text-xs uppercase tracking-wide">
                      Product
                    </th>
                    <th className="px-4 py-3 font-body font-medium text-muted text-xs uppercase tracking-wide">
                      Category
                    </th>
                    <th className="px-4 py-3 font-body font-medium text-muted text-xs uppercase tracking-wide">
                      Quantity
                    </th>
                    <th className="px-4 py-3 font-body font-medium text-muted text-xs uppercase tracking-wide">
                      Selling Price
                    </th>
                    <th className="px-4 py-3 font-body font-medium text-muted text-xs uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shop.stocks.map((stock) => {
                    const low = stock.quantity <= stock.product.lowStockThreshold;
                    return (
                      <tr
                        key={stock.id}
                        className={cn(low && "bg-amber-50/30")}
                      >
                        <td className="px-4 py-3 font-body text-agro-dark font-medium">
                          {stock.product.name}
                        </td>
                        <td className="px-4 py-3 font-body text-muted">
                          {stock.product.category.name}
                        </td>
                        <td className="px-4 py-3 font-body text-agro-dark">
                          {stock.quantity.toLocaleString()}{" "}
                          <span className="text-muted text-xs">
                            {stock.product.unit.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-body text-agro-dark">
                          {formatCurrency(stock.product.sellingPrice.toNumber())}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge low={low} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {shop.stocks.map((stock) => {
                const low = stock.quantity <= stock.product.lowStockThreshold;
                return (
                  <div
                    key={stock.id}
                    className={cn(
                      "rounded-[12px] border border-gray-200 bg-white p-4",
                      low && "bg-amber-50/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-body font-medium text-agro-dark">
                          {stock.product.name}
                        </h3>
                        <p className="text-xs text-muted mt-0.5">
                          {stock.product.category.name}
                        </p>
                      </div>
                      <StatusBadge low={low} />
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="font-display text-2xl font-bold text-agro-dark leading-none">
                          {stock.quantity.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {stock.product.unit.toLowerCase()}
                        </p>
                      </div>
                      <p className="text-sm text-agro-dark font-body">
                        {formatCurrency(stock.product.sellingPrice.toNumber())}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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

function StatusBadge({ low }: { low: boolean }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium",
        low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      )}
    >
      {low ? "Low" : "OK"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-8 text-center">
      <p className="text-muted text-sm font-body">{text}</p>
    </div>
  );
}
