"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Store,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
  CheckCircle2,
  Search,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductInfo {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  lowStockThreshold: number;
  category: { name: string };
  imageUrl?: string | null;
}

interface StockRow {
  id: string;
  quantity: number;
  product: ProductInfo;
}

interface ShopStockRow {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    unit: string;
    sellingPrice: number;
    lowStockThreshold: number;
  };
}

interface ShopWithStock {
  id: string;
  name: string;
  location: string | null;
  stocks: ShopStockRow[];
}

interface TransferItem {
  id: string;
  quantity: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";
  notes: string | null;
  createdAt: string;
  product: { name: string; unit: string };
  fromWarehouse: { name: string } | null;
  toWarehouse: { name: string } | null;
  toShop: { name: string } | null;
  requestedBy: { name: string };
}

interface WarehouseData {
  id: string;
  name: string;
  type: "AGRO_INPUT" | "GRAIN";
  location: string | null;
  isActive: boolean;
  createdAt: string;
  stocks: StockRow[];
  shops: ShopWithStock[];
}

interface Props {
  warehouse: WarehouseData;
  transfers: TransferItem[];
  otherWarehouses: { id: string; name: string; type: string }[];
  linkedShops: { id: string; name: string }[];
  allProducts: { id: string; name: string; unit: string }[];
}

type Tab = "STOCK" | "TRANSFERS" | "SHOPS";

// ─── Main Component ───────────────────────────────────────────────────────────

export function WarehouseDetailTabs({
  warehouse,
  transfers,
  otherWarehouses,
  linkedShops,
  allProducts,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("STOCK");
  const [showAddStock, setShowAddStock] = useState(false);
  const [adjustStock, setAdjustStock] = useState<{ stock: StockRow; defaultType: "IN" | "OUT" } | null>(null);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [stockSearch, setStockSearch] = useState("");

  const router = useRouter();

  const totalUnits = warehouse.stocks.reduce((s, st) => s + st.quantity, 0);
  const distinctSkus = warehouse.stocks.length;
  const lowStockCount = warehouse.stocks.filter(
    (s) => s.quantity <= s.product.lowStockThreshold
  ).length;
  const totalStockValue = warehouse.stocks.reduce(
    (s, st) => s + st.quantity * st.product.sellingPrice,
    0
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "STOCK", label: "Stock" },
    { key: "TRANSFERS", label: "Transfers" },
    { key: "SHOPS", label: "Shops" },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-[10px] w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-4 h-9 rounded-[8px] font-body text-sm font-medium transition-colors",
              activeTab === t.key
                ? "bg-white text-agro-dark shadow-sm"
                : "text-muted hover:text-agro-dark"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Stock ─────────────────────────────────────────────────── */}
      {activeTab === "STOCK" && (
        <div className="space-y-4">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-agro-dark">
              Stock in {warehouse.name}
            </h2>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Search products…"
                  className="h-11 pl-9 pr-3 w-44 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={() => setShowAddStock(true)}
                className="flex items-center gap-2 h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Units" value={totalUnits.toLocaleString()} />
            <StatCard label="Distinct Stock" value={distinctSkus.toString()} />
            <StatCard
              label="Low Stock"
              value={lowStockCount.toString()}
              highlight={lowStockCount > 0}
            />
            <StatCard label="Total Value" value={formatCurrency(totalStockValue)} />
          </div>

          {(() => {
            const visibleStocks = stockSearch
              ? warehouse.stocks.filter((s) =>
                  s.product.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                  s.product.category.name.toLowerCase().includes(stockSearch.toLowerCase())
                )
              : warehouse.stocks;
            return warehouse.stocks.length === 0 ? (
            <EmptyState text="No stock yet. Add a product to get started." />
          ) : visibleStocks.length === 0 ? (
            <EmptyState text={`No products match "${stockSearch}".`} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Product", "Category", "Quantity", "Selling Price", "Status", "Actions"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStocks.map((stock) => {
                      const low = stock.quantity <= stock.product.lowStockThreshold;
                      return (
                        <tr
                          key={stock.id}
                          className={cn(
                            "border-b border-gray-50 last:border-0 transition-colors",
                            low ? "bg-amber-50/20 hover:bg-amber-50/40 border-l-2 border-l-amber-400" : "hover:bg-gray-50/60"
                          )}
                        >
                          <td className="px-4 py-3">
                            <p className="font-body text-sm font-medium text-agro-dark">
                              {stock.product.name}
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-[4px] bg-gray-100 text-xs text-muted font-body">
                                {stock.product.unit.toLowerCase()}
                              </span>
                            </p>
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-muted">
                            {stock.product.category.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-display font-bold text-lg text-agro-dark">
                              {stock.quantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-display font-semibold text-primary">
                              {formatCurrency(stock.product.sellingPrice)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium",
                                low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              )}
                            >
                              {low ? "Low" : "OK"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setAdjustStock({ stock, defaultType: "IN" })}
                                title="Add stock"
                                className="h-8 w-8 flex items-center justify-center rounded-[6px] text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setAdjustStock({ stock, defaultType: "OUT" })}
                                title="Remove stock"
                                className="h-8 w-8 flex items-center justify-center rounded-[6px] text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {visibleStocks.map((stock) => {
                  const low = stock.quantity <= stock.product.lowStockThreshold;
                  return (
                    <div
                      key={stock.id}
                      className={cn(
                        "rounded-[12px] border border-gray-200 bg-white p-4",
                        low && "bg-amber-50/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-body font-medium text-agro-dark">{stock.product.name}</h3>
                          <p className="text-xs text-muted mt-0.5">{stock.product.category.name}</p>
                        </div>
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium shrink-0",
                            low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          )}
                        >
                          {low ? "Low" : "OK"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="font-display text-2xl font-bold text-agro-dark leading-none">
                            {stock.quantity.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted mt-1">{stock.product.unit.toLowerCase()}</p>
                        </div>
                        <p className="text-sm text-agro-dark font-body">
                          {formatCurrency(stock.product.sellingPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setAdjustStock({ stock, defaultType: "IN" })}
                          className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-gray-200 text-green-600 font-body text-xs hover:bg-green-50 transition-colors"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Add
                        </button>
                        <button
                          onClick={() => setAdjustStock({ stock, defaultType: "OUT" })}
                          className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-gray-200 text-red-500 font-body text-xs hover:bg-red-50 transition-colors"
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
          })()}
        </div>
      )}

      {/* ── Tab 2: Transfers ─────────────────────────────────────────────── */}
      {activeTab === "TRANSFERS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-agro-dark">Stock Transfers</h2>
            <button
              onClick={() => setShowNewTransfer(true)}
              className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors self-start sm:self-auto"
            >
              <ArrowRightLeft className="h-4 w-4" />
              New Transfer
            </button>
          </div>

          {transfers.length === 0 ? (
            <EmptyState text="No transfers yet. Use the New Transfer button to move stock between locations." />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Date", "Product", "Direction", "Qty", "From → To", "Status", "Notes", "Actions"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => (
                      <TransferTableRow
                        key={t.id}
                        transfer={t}
                        warehouseId={warehouse.id}
                        onRefresh={() => router.refresh()}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {transfers.map((t) => (
                  <TransferCard
                    key={t.id}
                    transfer={t}
                    warehouseId={warehouse.id}
                    onRefresh={() => router.refresh()}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab 3: Shops ─────────────────────────────────────────────────── */}
      {activeTab === "SHOPS" && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-agro-dark">Linked Shops</h2>
          {warehouse.shops.length === 0 ? (
            <EmptyState text="No shops linked to this warehouse." />
          ) : (
            <div className="space-y-4">
              {warehouse.shops.map((shop) => {
                const totalShopUnits = shop.stocks.reduce((s, st) => s + st.quantity, 0);
                const totalShopValue = shop.stocks.reduce(
                  (s, st) => s + st.quantity * st.product.sellingPrice,
                  0
                );
                const topStocks = shop.stocks
                  .slice()
                  .sort((a, b) => b.quantity - a.quantity)
                  .slice(0, 5);
                const remaining = shop.stocks.length - topStocks.length;

                return (
                  <div
                    key={shop.id}
                    className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-[8px] bg-primary/10 flex items-center justify-center shrink-0">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-agro-dark">{shop.name}</h3>
                          <p className="text-muted text-xs mt-0.5 font-body">
                            {shop.location || "No location set"}
                          </p>
                          <p className="text-muted text-xs mt-0.5 font-body">
                            {shop.stocks.length} SKU{shop.stocks.length !== 1 ? "s" : ""} ·{" "}
                            {totalShopUnits.toLocaleString()} units
                          </p>
                          <p className="text-muted text-xs mt-0.5 font-body">
                            Value:{" "}
                            <span className="font-semibold text-agro-dark">{formatCurrency(totalShopValue)}</span>
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/shops/${shop.id}`}
                        className="text-primary text-sm font-body font-medium hover:underline shrink-0"
                      >
                        View Shop →
                      </Link>
                    </div>

                    {topStocks.length === 0 ? (
                      <p className="text-muted text-sm font-body">No stock in this shop yet.</p>
                    ) : (
                      <div className="rounded-[8px] border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50/60 border-b border-gray-100">
                              <th className="text-left px-3 py-2 font-body text-xs text-muted font-semibold uppercase tracking-wide">
                                Product
                              </th>
                              <th className="text-left px-3 py-2 font-body text-xs text-muted font-semibold uppercase tracking-wide">
                                Qty
                              </th>
                              <th className="text-left px-3 py-2 font-body text-xs text-muted font-semibold uppercase tracking-wide">
                                Unit
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {topStocks.map((s) => (
                              <tr key={s.id}>
                                <td className="px-3 py-2 font-body text-sm text-agro-dark">{s.product.name}</td>
                                <td className="px-3 py-2 font-body text-sm text-agro-dark">{s.quantity.toLocaleString()}</td>
                                <td className="px-3 py-2 font-body text-xs text-muted">{s.product.unit.toLowerCase()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {remaining > 0 && (
                          <p className="px-3 py-2 text-xs text-muted font-body border-t border-gray-100">
                            and {remaining} more product{remaining !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showAddStock && (
        <AddStockModal
          warehouseId={warehouse.id}
          warehouseStocks={warehouse.stocks}
          allProducts={allProducts}
          onClose={() => setShowAddStock(false)}
          onSaved={() => { setShowAddStock(false); router.refresh(); }}
        />
      )}

      {adjustStock && (
        <AdjustStockModal
          warehouseId={warehouse.id}
          stock={adjustStock.stock}
          defaultType={adjustStock.defaultType}
          onClose={() => setAdjustStock(null)}
          onSaved={() => { setAdjustStock(null); router.refresh(); }}
        />
      )}

      {showNewTransfer && (
        <NewTransferModal
          warehouse={warehouse}
          otherWarehouses={otherWarehouses}
          linkedShops={linkedShops}
          allProducts={allProducts}
          onClose={() => setShowNewTransfer(false)}
          onSaved={() => { setShowNewTransfer(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Transfer Row (desktop table) ─────────────────────────────────────────────

function TransferTableRow({
  transfer: t,
  onRefresh,
}: {
  transfer: TransferItem;
  warehouseId: string;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);

  async function act(action: "APPROVE" | "REJECT") {
    setActing(true);
    try {
      await fetch("/api/dashboard/inventory/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId: t.id, action }),
      });
      onRefresh();
    } finally {
      setActing(false);
    }
  }

  const isToShop = !!t.toShop;
  const isToWarehouse = !!t.toWarehouse && !t.toShop;
  const directionLabel = isToShop ? "→ Shop" : isToWarehouse ? "→ Warehouse" : "← Return";
  const directionClass = isToShop
    ? "bg-purple-50 text-purple-700"
    : isToWarehouse
    ? "bg-blue-50 text-blue-700"
    : "bg-amber-50 text-amber-700";

  const destination = t.toShop?.name ?? t.toWarehouse?.name ?? "—";
  const source = t.fromWarehouse?.name ?? "—";

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3 font-body text-sm text-muted whitespace-nowrap">
        {formatDate(t.createdAt)}
      </td>
      <td className="px-4 py-3 font-body text-sm text-agro-dark">
        {t.product.name}
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium", directionClass)}>
          {directionLabel}
        </span>
      </td>
      <td className="px-4 py-3 font-body text-sm text-agro-dark">
        {t.quantity.toLocaleString()}{" "}
        <span className="text-xs text-muted">{t.product.unit.toLowerCase()}</span>
      </td>
      <td className="px-4 py-3 font-body text-sm text-agro-dark">
        {source} → {destination}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <TransferStatusBadge status={t.status} />
          {t.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
      </td>
      <td className="px-4 py-3 font-body text-sm text-muted max-w-[150px]">
        {t.notes ? (t.notes.length > 30 ? t.notes.slice(0, 30) + "…" : t.notes) : "—"}
      </td>
      <td className="px-4 py-3">
        {t.status === "PENDING" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => act("APPROVE")}
              disabled={acting}
              className="h-8 px-2 rounded-[6px] bg-green-50 text-green-700 font-body text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => act("REJECT")}
              disabled={acting}
              className="h-8 px-2 rounded-[6px] bg-red-50 text-red-700 font-body text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Transfer Card (mobile) ───────────────────────────────────────────────────

function TransferCard({
  transfer: t,
  onRefresh,
}: {
  transfer: TransferItem;
  warehouseId: string;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);

  async function act(action: "APPROVE" | "REJECT") {
    setActing(true);
    try {
      await fetch("/api/dashboard/inventory/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId: t.id, action }),
      });
      onRefresh();
    } finally {
      setActing(false);
    }
  }

  const isToShop = !!t.toShop;
  const isToWarehouse = !!t.toWarehouse && !t.toShop;
  const directionLabel = isToShop ? "→ Shop" : isToWarehouse ? "→ Warehouse" : "← Return";
  const directionClass = isToShop
    ? "bg-purple-50 text-purple-700"
    : isToWarehouse
    ? "bg-blue-50 text-blue-700"
    : "bg-amber-50 text-amber-700";

  const destination = t.toShop?.name ?? t.toWarehouse?.name ?? "—";
  const source = t.fromWarehouse?.name ?? "—";

  return (
    <div className="bg-white rounded-[12px] border border-gray-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body text-sm font-medium text-agro-dark">{t.product.name}</p>
          <p className="font-body text-xs text-muted">{formatDate(t.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TransferStatusBadge status={t.status} />
          {t.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium", directionClass)}>
          {directionLabel}
        </span>
        <span className="font-body text-xs text-muted">{source} → {destination}</span>
      </div>
      <p className="font-body text-sm text-agro-dark font-medium">
        {t.quantity.toLocaleString()} {t.product.unit.toLowerCase()}
      </p>
      {t.notes && (
        <p className="font-body text-xs text-muted italic">
          {t.notes.length > 30 ? t.notes.slice(0, 30) + "…" : t.notes}
        </p>
      )}
      {t.status === "PENDING" && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => act("APPROVE")}
            disabled={acting}
            className="flex-1 h-9 rounded-[8px] bg-green-50 text-green-700 font-body text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => act("REJECT")}
            disabled={acting}
            className="flex-1 h-9 rounded-[8px] bg-red-50 text-red-700 font-body text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Transfer Status Badge ────────────────────────────────────────────────────

function TransferStatusBadge({ status }: { status: TransferItem["status"] }) {
  const map: Record<TransferItem["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium shrink-0", map[status])}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── AdjustStockModal ─────────────────────────────────────────────────────────

function AdjustStockModal({
  warehouseId,
  stock,
  defaultType,
  onClose,
  onSaved,
}: {
  warehouseId: string;
  stock: StockRow;
  defaultType: "IN" | "OUT";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">(defaultType);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typeLabels = { IN: "Add Stock", OUT: "Remove Stock", ADJUSTMENT: "Set Stock Level" };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: stock.product.id,
          type,
          quantity,
          note: note || undefined,
          warehouseId,
        }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to update stock");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-sm bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Adjust Stock</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-[8px] p-3">
            <p className="font-body text-sm font-medium text-agro-dark">{stock.product.name}</p>
            <p className="font-body text-xs text-muted mt-0.5">
              Current qty: <strong>{stock.quantity.toLocaleString()} {stock.product.unit.toLowerCase()}</strong>
            </p>
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1.5">Transaction Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["IN", "OUT", "ADJUSTMENT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "h-10 rounded-[8px] font-body text-xs font-medium transition-colors border",
                    type === t
                      ? "bg-agro-dark text-white border-transparent"
                      : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {t === "IN" ? "Add" : t === "OUT" ? "Remove" : "Adjust"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1">
              {type === "ADJUSTMENT" ? "New Stock Level" : "Quantity"} ({stock.product.unit}) *
            </label>
            <input
              required
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received from supplier"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : typeLabels[type]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AddStockModal ────────────────────────────────────────────────────────────

function AddStockModal({
  warehouseId,
  warehouseStocks,
  allProducts,
  onClose,
  onSaved,
}: {
  warehouseId: string;
  warehouseStocks: StockRow[];
  allProducts: { id: string; name: string; unit: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const existingIds = new Set(warehouseStocks.map((s) => s.product.id));
  const available = allProducts.filter((p) => !existingIds.has(p.id));

  const [productId, setProductId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      setError("Please select a product");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          type: "IN",
          quantity,
          note: note || undefined,
          warehouseId,
        }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to add stock");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-sm bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Product to Warehouse</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          {available.length === 0 ? (
            <p className="text-muted text-sm font-body">All active products are already in this warehouse.</p>
          ) : (
            <>
              <div>
                <label className="block font-body text-xs text-muted mb-1">Product *</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-body text-xs text-muted mb-1">
                  Quantity ({available.find((p) => p.id === productId)?.unit ?? ""}) *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block font-body text-xs text-muted mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Initial stock"
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            {available.length > 0 && (
              <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
                {saving ? "Saving..." : "Add Stock"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── NewTransferModal ─────────────────────────────────────────────────────────

type TransferDirection = "TO_SHOP" | "TO_WAREHOUSE" | "RETURN";

function NewTransferModal({
  warehouse,
  otherWarehouses,
  linkedShops,
  allProducts,
  onClose,
  onSaved,
}: {
  warehouse: WarehouseData;
  otherWarehouses: { id: string; name: string; type: string }[];
  linkedShops: { id: string; name: string }[];
  allProducts: { id: string; name: string; unit: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [direction, setDirection] = useState<TransferDirection>("TO_SHOP");
  const [productId, setProductId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // For → Shop and → Warehouse: only products already in this warehouse
  const warehouseProductIds = new Set(warehouse.stocks.map((s) => s.product.id));
  const transferableProducts =
    direction === "RETURN"
      ? allProducts
      : allProducts.filter((p) => warehouseProductIds.has(p.id));

  const currentStock =
    productId
      ? warehouse.stocks.find((s) => s.product.id === productId)?.quantity ?? null
      : null;

  const directionOptions: { key: TransferDirection; label: string }[] = [
    { key: "TO_SHOP", label: "→ Shop" },
    { key: "TO_WAREHOUSE", label: "⇄ Warehouse" },
    { key: "RETURN", label: "← Return" },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) { setError("Select a product"); return; }
    if (!destinationId) { setError("Select a destination"); return; }

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        productId,
        quantity,
        notes: notes || undefined,
        immediate: true,
      };

      if (direction === "TO_SHOP") {
        payload.fromWarehouseId = warehouse.id;
        payload.toShopId = destinationId;
      } else if (direction === "TO_WAREHOUSE") {
        payload.fromWarehouseId = warehouse.id;
        payload.toWarehouseId = destinationId;
      } else {
        // RETURN: shop → this warehouse
        payload.fromShopId = destinationId;
        payload.toWarehouseId = warehouse.id;
      }

      const res = await fetch("/api/dashboard/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to create transfer");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">New Transfer</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Direction picker */}
          <div>
            <label className="block font-body text-xs text-muted mb-1.5">Direction</label>
            <div className="grid grid-cols-3 gap-1.5">
              {directionOptions.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => { setDirection(d.key); setProductId(""); setDestinationId(""); }}
                  className={cn(
                    "h-10 rounded-[8px] font-body text-xs font-medium transition-colors border",
                    direction === d.key
                      ? "bg-agro-dark text-white border-transparent"
                      : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">
              {direction === "TO_SHOP" ? "Destination Shop *" :
               direction === "TO_WAREHOUSE" ? "Destination Warehouse *" :
               "Source Shop *"}
            </label>
            {direction === "TO_SHOP" ? (
              linkedShops.length === 0 ? (
                <p className="text-muted text-sm font-body">No active shops linked to this warehouse.</p>
              ) : (
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" disabled>Select shop…</option>
                  {linkedShops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )
            ) : direction === "TO_WAREHOUSE" ? (
              otherWarehouses.length === 0 ? (
                <p className="text-muted text-sm font-body">No other active warehouses.</p>
              ) : (
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" disabled>Select warehouse…</option>
                  {otherWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type === "AGRO_INPUT" ? "Agro Input" : "Grain"})
                    </option>
                  ))}
                </select>
              )
            ) : (
              linkedShops.length === 0 ? (
                <p className="text-muted text-sm font-body">No active shops linked to this warehouse.</p>
              ) : (
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="" disabled>Select shop to return from…</option>
                  {linkedShops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )
            )}
          </div>

          {/* Product */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Product *</label>
            {transferableProducts.length === 0 ? (
              <p className="text-muted text-sm font-body">
                No products available for transfer. Stock this warehouse first.
              </p>
            ) : (
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
              >
                <option value="" disabled>Select product…</option>
                {transferableProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Current stock display */}
          {productId && currentStock !== null && (
            <div className="bg-gray-50 rounded-[8px] px-3 py-2">
              <p className="font-body text-xs text-muted">
                Available in this warehouse:{" "}
                <strong className="text-agro-dark">{currentStock.toLocaleString()} {allProducts.find((p) => p.id === productId)?.unit?.toLowerCase()}</strong>
              </p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Quantity *</label>
            <input
              required
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekly shop replenishment"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Creating..." : "Create Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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
        <p className="text-xs text-muted font-body uppercase tracking-wide">{label}</p>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-8 text-center">
      <p className="text-muted text-sm font-body">{text}</p>
    </div>
  );
}
