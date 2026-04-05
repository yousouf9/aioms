"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Calendar, Users, Package, Loader2, ShoppingCart, CreditCard } from "lucide-react";

type DailyRevenue = { date: string; total: number };
type TopProduct = { name: string; quantity: number; total: number };
type StaffAttendance = { name: string; role: string; sessions: number; totalMinutes: number };
type StaffSalesPerformance = {
  name: string;
  role: string;
  totalSales: number;
  transactionCount: number;
  paymentMethods: Record<string, number>;
};

type ReportData = {
  totalRevenue: number;
  breakdown: {
    orders: { total: number; count: number };
    sales: { total: number; count: number };
    credit: { total: number; count: number };
  };
  orderStats: Record<string, number>;
  creditStats: Record<string, number>;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  staffAttendance: StaffAttendance[];
  staffSalesPerformance: StaffSalesPerformance[];
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  STAFF: "Staff",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const CREDIT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  DEFAULTED: "Defaulted",
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function MiniBarChart({ data, maxValue }: { data: DailyRevenue[]; maxValue: number }) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="font-body text-sm text-muted">No data for this period</p>
      </div>
    );
  }

  return (
    <div className="h-32 flex items-end gap-1 overflow-hidden">
      {data.map((d) => {
        const pct = maxValue > 0 ? (d.total / maxValue) * 100 : 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${formatShortDate(d.date)}: ${formatCurrency(d.total)}`}
          >
            <div
              className="w-full bg-primary/80 rounded-t-[3px] transition-all group-hover:bg-primary min-h-[2px]"
              style={{ height: `${Math.max(2, pct)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function PeriodButton({ active, onClick, label, disabled }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 h-8 font-body text-xs rounded-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? "bg-primary text-white font-semibold"
          : "border border-gray-200 text-muted hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

export function ReportsClient({ initialData }: { initialData: ReportData }) {
  const [data, setData] = useState<ReportData>(initialData);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(false);

  async function fetchPeriod(days: number) {
    if (days === period) return;
    setLoading(true);
    setPeriod(days);
    try {
      const res = await fetch(`/api/dashboard/reports?period=${days}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  const maxDaily = Math.max(...data.dailyRevenue.map((d) => d.total), 1);
  const totalOrders = Object.values(data.orderStats).reduce((a, b) => a + b, 0);
  const totalCredits = Object.values(data.creditStats).reduce((a, b) => a + b, 0);

  const revenueShare = [
    { label: "Orders", value: data.breakdown.orders.total, color: "bg-primary" },
    { label: "Walk-in Sales", value: data.breakdown.sales.total, color: "bg-accent" },
    { label: "Credit Repayments", value: data.breakdown.credit.total, color: "bg-blue-400" },
  ];
  const revenueTotal = data.totalRevenue || 1;

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-frost-white/60 rounded-[12px]">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-[8px] shadow-card border border-gray-200">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-body text-sm text-muted">Loading report...</span>
          </div>
        </div>
      )}
      {/* Period selector */}
      <div className="flex items-center gap-2 mb-6">
        <span className="font-body text-xs text-muted mr-1">Period:</span>
        <PeriodButton active={period === 7} onClick={() => fetchPeriod(7)} label="7 days" disabled={loading} />
        <PeriodButton active={period === 30} onClick={() => fetchPeriod(30)} label="30 days" disabled={loading} />
        <PeriodButton active={period === 90} onClick={() => fetchPeriod(90)} label="90 days" disabled={loading} />
        <PeriodButton active={period === 365} onClick={() => fetchPeriod(365)} label="1 year" disabled={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Daily revenue chart */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-agro-dark">Daily Revenue</h2>
              <p className="font-body text-xs text-muted mt-0.5">Last {period} days</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <MiniBarChart data={data.dailyRevenue} maxValue={maxDaily} />
          {data.dailyRevenue.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="font-body text-xs text-muted">{formatShortDate(data.dailyRevenue[0].date)}</span>
              <span className="font-body text-xs text-muted">{formatShortDate(data.dailyRevenue[data.dailyRevenue.length - 1].date)}</span>
            </div>
          )}
        </div>

        {/* Revenue breakdown */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-agro-dark">Revenue Sources</h2>
              <p className="font-body text-xs text-muted mt-0.5">Total: {formatCurrency(data.totalRevenue)}</p>
            </div>
          </div>

          {/* Stacked bar */}
          <div className="h-3 w-full rounded-full overflow-hidden flex mb-4">
            {revenueShare.map((s) => (
              <div
                key={s.label}
                className={`${s.color} transition-all`}
                style={{ width: `${(s.value / revenueTotal) * 100}%` }}
              />
            ))}
          </div>

          <div className="space-y-3">
            {revenueShare.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  <span className="font-body text-sm text-agro-dark">{s.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-body text-sm font-medium text-agro-dark">{formatCurrency(s.value)}</span>
                  <span className="font-body text-xs text-muted ml-2">
                    {revenueTotal > 1 ? `${Math.round((s.value / revenueTotal) * 100)}%` : "0%"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Order stats */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-agro-dark">Orders</h2>
            <Calendar className="h-4 w-4 text-muted" />
          </div>
          <p className="font-display font-bold text-3xl text-agro-dark mb-3">{totalOrders}</p>
          <div className="space-y-2">
            {Object.entries(data.orderStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="font-body text-xs text-muted">{ORDER_STATUS_LABEL[status] ?? status}</span>
                <span className="font-body text-xs font-medium text-agro-dark">{count}</span>
              </div>
            ))}
            {Object.keys(data.orderStats).length === 0 && (
              <p className="font-body text-xs text-muted">No orders in period</p>
            )}
          </div>
        </div>

        {/* Credit stats */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-agro-dark">Credit Sales</h2>
            <CreditCard className="h-4 w-4 text-muted" />
          </div>
          <p className="font-display font-bold text-3xl text-agro-dark mb-3">{totalCredits}</p>
          <div className="space-y-2">
            {Object.entries(data.creditStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="font-body text-xs text-muted">{CREDIT_STATUS_LABEL[status] ?? status}</span>
                <span className="font-body text-xs font-medium text-agro-dark">{count}</span>
              </div>
            ))}
            {Object.keys(data.creditStats).length === 0 && (
              <p className="font-body text-xs text-muted">No credit sales in period</p>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-agro-dark">Top Products</h2>
            <Package className="h-4 w-4 text-muted" />
          </div>
          {data.topProducts.length === 0 ? (
            <p className="font-body text-sm text-muted">No sales in period</p>
          ) : (
            <div className="space-y-2.5">
              {data.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="font-body text-xs text-muted w-4">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-agro-dark truncate">{p.name}</p>
                    <p className="font-body text-xs text-muted">{p.quantity} units</p>
                  </div>
                  <span className="font-body text-sm font-medium text-agro-dark whitespace-nowrap">
                    {formatCurrency(p.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff Sales Performance */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-agro-dark">Staff Sales Performance</h2>
          <ShoppingCart className="h-4 w-4 text-muted" />
        </div>
        {(!data.staffSalesPerformance || data.staffSalesPerformance.length === 0) ? (
          <div className="px-5 py-10 text-center">
            <p className="font-body text-sm text-muted">No sales recorded in this period.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {data.staffSalesPerformance.map((s) => (
                <div key={s.name} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-body text-sm font-medium text-agro-dark">{s.name}</p>
                      <p className="font-body text-xs text-muted">{ROLE_LABEL[s.role] ?? s.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-sm text-agro-dark">{formatCurrency(s.totalSales)}</p>
                      <p className="font-body text-xs text-muted">{s.transactionCount} sale{s.transactionCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {Object.entries(s.paymentMethods).map(([method, count]) => (
                      <span key={method} className="font-body text-xs text-muted px-2 py-0.5 bg-gray-100 rounded-[4px]">
                        {method} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Staff", "Role", "Transactions", "Total Sales", "Avg / Sale", "Methods"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staffSalesPerformance.map((s) => (
                    <tr key={s.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-body text-sm font-medium text-agro-dark">{s.name}</td>
                      <td className="px-4 py-3 font-body text-xs text-muted">{ROLE_LABEL[s.role] ?? s.role}</td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{s.transactionCount}</td>
                      <td className="px-4 py-3 font-display font-semibold text-sm text-agro-dark">{formatCurrency(s.totalSales)}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted">
                        {formatCurrency(s.transactionCount > 0 ? s.totalSales / s.transactionCount : 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(s.paymentMethods).map(([method, count]) => (
                            <span key={method} className="font-body text-xs text-muted px-2 py-0.5 bg-gray-100 rounded-[4px]">
                              {method} ({count})
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Staff attendance summary */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-agro-dark">Staff Attendance</h2>
          <Users className="h-4 w-4 text-muted" />
        </div>
        {data.staffAttendance.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-body text-sm text-muted">No attendance records in this period.</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {data.staffAttendance.map((s) => (
                <div key={s.name} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm font-medium text-agro-dark">{s.name}</p>
                    <p className="font-body text-xs text-muted">{ROLE_LABEL[s.role] ?? s.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-sm font-medium text-agro-dark">{formatMinutes(s.totalMinutes)}</p>
                    <p className="font-body text-xs text-muted">{s.sessions} session{s.sessions !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Staff", "Role", "Sessions", "Total Hours"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staffAttendance.map((s) => (
                    <tr key={s.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-body text-sm font-medium text-agro-dark">{s.name}</td>
                      <td className="px-4 py-3 font-body text-xs text-muted">{ROLE_LABEL[s.role] ?? s.role}</td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{s.sessions}</td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{formatMinutes(s.totalMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
