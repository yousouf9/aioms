"use client";

import { useState } from "react";
import { Download, AlertTriangle, Package, TrendingUp, TrendingDown, BarChart2, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReportData {
  summary: {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalCostValue: number;
    totalSellingValue: number;
    potentialProfit: number;
    stockIn: number;
    stockOut: number;
    adjustments: number;
  };
  categoryBreakdown: { name: string; count: number; stockValue: number; lowStock: number }[];
  topSelling: { name: string; category: string; qty: number; revenue: number }[];
  lowStockProducts: { name: string; category: string; qty: number; threshold: number }[];
  outOfStockProducts: { name: string; category: string }[];
  products: {
    id: string;
    name: string;
    category: string;
    type: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    margin: number;
    totalStock: number;
    stockCostValue: number;
    stockSellingValue: number;
    lowStockThreshold: number;
    status: string;
    isActive: boolean;
  }[];
  recentTransactions: {
    date: string;
    product: string;
    type: string;
    quantity: number;
    note: string | null;
    user: string;
  }[];
}

export function InventoryReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  async function loadReport(period?: number) {
    const d = period ?? days;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/inventory/report?days=${d}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const res = await fetch(`/api/dashboard/inventory/report?format=csv&days=${days}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `turf-inventory-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (!data) {
    return (
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-8 text-center">
        <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <BarChart2 className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-agro-dark text-lg mb-2">Inventory Report</h3>
        <p className="font-body text-sm text-muted mb-5 max-w-sm mx-auto">
          Generate a detailed overview of your stock levels, values, movements, and top selling products
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <select
            className="bg-white border border-gray-200 text-agro-dark rounded-[8px] h-11 px-3 font-body text-sm focus:outline-none focus:border-primary"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => loadReport()}
            disabled={loading}
            className="h-11 px-5 bg-primary text-agro-dark font-display font-semibold text-sm rounded-[8px] hover:bg-primary/90 transition-colors glow-emerald disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <select
            className="bg-white border border-gray-200 text-agro-dark rounded-[8px] h-11 px-3 font-body text-sm focus:outline-none focus:border-primary"
            value={days}
            onChange={(e) => { setDays(Number(e.target.value)); }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => loadReport()}
            disabled={loading}
            className="h-11 px-4 flex items-center gap-2 border border-gray-200 text-muted font-body text-sm rounded-[8px] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <button
          onClick={exportCSV}
          disabled={exporting}
          className="h-11 px-4 flex items-center gap-2 bg-primary text-agro-dark font-display font-semibold text-sm rounded-[8px] hover:bg-primary/90 transition-colors glow-emerald disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={String(s.totalProducts)} sub={`${s.activeProducts} active`} />
        <StatCard label="Stock Value (Cost)" value={formatCurrency(s.totalCostValue)} accent="text-agro-dark" />
        <StatCard label="Stock Value (Selling)" value={formatCurrency(s.totalSellingValue)} accent="text-primary" />
        <StatCard label="Potential Profit" value={formatCurrency(s.potentialProfit)} accent="text-primary" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Low Stock"
          value={String(s.lowStockCount)}
          accent={s.lowStockCount > 0 ? "text-status-pending" : "text-muted"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Out of Stock"
          value={String(s.outOfStockCount)}
          accent={s.outOfStockCount > 0 ? "text-status-cancelled" : "text-muted"}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label={`Stock In (${days}d)`}
          value={String(s.stockIn)}
          accent="text-status-confirmed"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label={`Stock Out (${days}d)`}
          value={String(s.stockOut)}
          accent="text-status-cancelled"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      {/* Alerts: low stock + out of stock */}
      {(data.lowStockProducts.length > 0 || data.outOfStockProducts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.outOfStockProducts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-4">
              <p className="font-display font-semibold text-sm text-red-700 mb-2">
                Out of Stock ({data.outOfStockProducts.length})
              </p>
              <ul className="space-y-1">
                {data.outOfStockProducts.map((p, i) => (
                  <li key={`oos-${i}`} className="font-body text-xs text-red-600 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    {p.name} <span className="text-red-400">({p.category})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.lowStockProducts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4">
              <p className="font-display font-semibold text-sm text-amber-700 mb-2">
                Low Stock ({data.lowStockProducts.length})
              </p>
              <ul className="space-y-1">
                {data.lowStockProducts.map((p, i) => (
                  <li key={`low-${i}`} className="font-body text-xs text-amber-700 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    {p.name} — {p.qty}/{p.threshold} <span className="text-amber-500">({p.category})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown + Top selling side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <h3 className="font-display font-semibold text-agro-dark mb-3">Stock by Category</h3>
          {data.categoryBreakdown.length === 0 ? (
            <p className="font-body text-sm text-muted">No data</p>
          ) : (
            <div className="space-y-3">
              {data.categoryBreakdown.map((cat) => {
                const maxValue = data.categoryBreakdown[0]?.stockValue || 1;
                const pct = (cat.stockValue / maxValue) * 100;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-sm text-agro-dark">{cat.name}</span>
                      <span className="font-body text-xs text-muted">
                        {cat.count} products · {formatCurrency(cat.stockValue)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {cat.lowStock > 0 && (
                      <p className="font-body text-xs text-status-pending mt-0.5">{cat.lowStock} low stock</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top selling */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <h3 className="font-display font-semibold text-agro-dark mb-3">Top Selling ({days}d)</h3>
          {data.topSelling.length === 0 ? (
            <p className="font-body text-sm text-muted">No sales data for this period</p>
          ) : (
            <div className="space-y-2">
              {data.topSelling.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center font-display text-xs font-bold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-agro-dark truncate">{item.name}</p>
                    <p className="font-body text-xs text-muted">{item.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-sm font-semibold text-agro-dark">{item.qty} sold</p>
                    <p className="font-body text-xs text-muted">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product detail table */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-agro-dark">All Products Detail</h3>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {data.products.map((p) => (
            <div key={p.id ?? p.name} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="font-body text-sm font-medium text-agro-dark">{p.name}</p>
                  <p className="font-body text-xs text-muted">{p.category}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs font-body">
                <div>
                  <p className="text-muted">Qty</p>
                  <p className="text-agro-dark font-medium">{p.totalStock} {p.unit}</p>
                </div>
                <div>
                  <p className="text-muted">Cost</p>
                  <p className="text-agro-dark">{formatCurrency(p.costPrice)}</p>
                </div>
                <div>
                  <p className="text-muted">Sell</p>
                  <p className="text-agro-dark">{formatCurrency(p.sellingPrice)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1 text-xs font-body">
                <div>
                  <p className="text-muted">Margin</p>
                  <p className="text-agro-dark">{p.margin.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted">Stock Val</p>
                  <p className="text-agro-dark">{formatCurrency(p.stockSellingValue)}</p>
                </div>
                <div>
                  <p className="text-muted">Threshold</p>
                  <p className="text-agro-dark">{p.lowStockThreshold}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Product", "Category", "Qty", "Cost", "Sell", "Margin", "Stock Value", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id ?? p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-body text-sm text-agro-dark">{p.name}</td>
                  <td className="px-4 py-2.5 font-body text-sm text-muted">{p.category}</td>
                  <td className="px-4 py-2.5 font-body text-sm text-agro-dark">{p.totalStock} {p.unit}</td>
                  <td className="px-4 py-2.5 font-body text-xs text-muted whitespace-nowrap">{formatCurrency(p.costPrice)}</td>
                  <td className="px-4 py-2.5 font-body text-xs text-muted whitespace-nowrap">{formatCurrency(p.sellingPrice)}</td>
                  <td className="px-4 py-2.5 font-body text-xs text-muted">{p.margin.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 font-body text-xs text-agro-dark whitespace-nowrap">{formatCurrency(p.stockSellingValue)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent transactions */}
      {data.recentTransactions.length > 0 && (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-display font-semibold text-agro-dark">Recent Stock Movements</h3>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-50">
            {data.recentTransactions.slice(0, 20).map((t, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-body text-sm text-agro-dark">{t.product}</p>
                  <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-[6px] ${
                    t.type === "IN" ? "bg-green-50 text-status-confirmed" :
                    t.type === "OUT" ? "bg-red-50 text-status-cancelled" :
                    "bg-gray-100 text-muted"
                  }`}>
                    {t.type === "IN" ? `+${t.quantity}` : t.type === "OUT" ? `-${t.quantity}` : `±${t.quantity}`}
                  </span>
                </div>
                <p className="font-body text-xs text-muted">
                  {new Date(t.date).toLocaleDateString("en-NG")} · {t.user}
                  {t.note ? ` · ${t.note}` : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Date", "Product", "Type", "Qty", "Note", "User"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2 font-body text-xs text-muted whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString("en-NG")}
                    </td>
                    <td className="px-4 py-2 font-body text-sm text-agro-dark">{t.product}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-[6px] ${
                        t.type === "IN" ? "bg-green-50 text-status-confirmed" :
                        t.type === "OUT" ? "bg-red-50 text-status-cancelled" :
                        "bg-gray-100 text-muted"
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-body text-sm text-agro-dark">{t.quantity}</td>
                    <td className="px-4 py-2 font-body text-xs text-muted">{t.note ?? "—"}</td>
                    <td className="px-4 py-2 font-body text-xs text-muted">{t.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = "text-agro-dark",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={accent}>{icon}</span>}
        <p className="font-body text-xs text-muted">{label}</p>
      </div>
      <p className={`font-display font-bold text-2xl ${accent}`}>{value}</p>
      {sub && <p className="font-body text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; className: string }> = {
    OK: { label: "OK", className: "bg-green-50 text-status-confirmed" },
    LOW_STOCK: { label: "Low", className: "bg-amber-50 text-status-pending" },
    OUT_OF_STOCK: { label: "Out", className: "bg-red-50 text-status-cancelled" },
  };
  const s = styles[status] ?? { label: status, className: "bg-gray-100 text-muted" };
  return (
    <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-[6px] ${s.className}`}>
      {s.label}
    </span>
  );
}
