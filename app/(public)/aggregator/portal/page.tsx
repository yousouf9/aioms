"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Plus,
  LogOut,
  Handshake,
  Clock,
  CheckCircle,
  XCircle,
  FileSignature,
  ArrowRightLeft,
  PackageCheck,
  CircleCheckBig,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Offer = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  offeredPrice: number;
  counterPrice: number | null;
  counterQuantity: number | null;
  agreedPrice: number | null;
  agreedQuantity: number | null;
  status: string;
  advancePaid: number;
  totalPaid: number;
  totalDelivered: number;
  deliveryCount: number;
  createdAt: string;
};

type Profile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profileImageUrl: string | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  COUNTERED: { label: "Countered", color: "bg-blue-100 text-blue-700", icon: ArrowRightLeft },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  AGREEMENT_SENT: { label: "Sign Doc", color: "bg-indigo-100 text-indigo-700", icon: FileSignature },
  AGREEMENT_UPLOADED: { label: "In Review", color: "bg-orange-100 text-orange-700", icon: Clock },
  AGREEMENT_SIGNED: { label: "Signed", color: "bg-purple-100 text-purple-700", icon: FileSignature },
  SUPPLIED: { label: "Supplied", color: "bg-teal-100 text-teal-700", icon: PackageCheck },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CircleCheckBig },
};

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "COUNTERED", label: "Countered" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "AGREEMENT_SENT", label: "Sign Doc" },
  { key: "AGREEMENT_UPLOADED", label: "In Review" },
  { key: "AGREEMENT_SIGNED", label: "Signed" },
  { key: "SUPPLIED", label: "Supplied" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
];

function PaginationBar({ pagination, onPage }: { pagination: Pagination; onPage: (p: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 px-4">
      <p className="text-xs text-muted">
        {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex gap-2">
        <button onClick={() => onPage(pagination.page - 1)} disabled={pagination.page <= 1}
          className="h-11 px-3 rounded-[8px] border border-gray-200 text-muted-dark hover:bg-gray-50 transition-colors disabled:opacity-30 flex items-center gap-1 text-sm">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="flex items-center px-3 text-sm text-muted-dark">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button onClick={() => onPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
          className="h-11 px-3 rounded-[8px] border border-gray-200 text-muted-dark hover:bg-gray-50 transition-colors disabled:opacity-30 flex items-center gap-1 text-sm">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AggregatorPortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadProfile = useCallback(async () => {
    try {
      const meRes = await fetch("/api/public/aggregator/auth/me");
      if (!meRes.ok) { router.push("/aggregator/login"); return; }
      const meData = await meRes.json();
      if (meData.success) {
        if (!meData.data.isEmailVerified) { router.push("/aggregator/verify-email"); return; }
        setProfile(meData.data);
      } else { router.push("/aggregator/login"); }
    } catch {
      router.push("/aggregator/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadOffers = useCallback(async (page = 1) => {
    setOffersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/public/aggregator/offers?${params}`);
      const data = await res.json();
      if (data.success) {
        setOffers(data.data);
        setPagination(data.pagination);
        setCounts(data.counts || {});
      }
    } finally {
      setOffersLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { loadOffers(1); }, [loadOffers]);

  const handleLogout = async () => {
    await fetch("/api/public/aggregator/auth/logout", { method: "POST" });
    router.push("/aggregator/login");
  };

  if (loading) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalAll = Object.values(counts).reduce((s, c) => s + c, 0);
  const stats = {
    total: totalAll,
    pending: (counts.PENDING ?? 0) + (counts.COUNTERED ?? 0),
    active: (counts.ACCEPTED ?? 0) + (counts.AGREEMENT_SENT ?? 0) + (counts.AGREEMENT_UPLOADED ?? 0) + (counts.AGREEMENT_SIGNED ?? 0) + (counts.SUPPLIED ?? 0),
    completed: counts.COMPLETED ?? 0,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-agro-dark">
            Welcome, {profile?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-dark text-sm mt-0.5">Aggregator Portal</p>
        </div>
        <button
          onClick={handleLogout}
          className="h-11 px-4 rounded-[8px] border border-gray-200 text-muted-dark text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-agro-dark">{stats.total}</p>
          <p className="text-xs text-muted mt-1">Total Offers</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-muted mt-1">In Negotiation</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-primary">{stats.active}</p>
          <p className="text-xs text-muted mt-1">Active Deals</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-xs text-muted mt-1">Completed</p>
        </div>
      </div>

      {/* New Offer CTA */}
      <Link
        href="/aggregator/portal/offers/new"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors mb-6"
      >
        <Plus className="h-5 w-5" /> Submit New Offer
      </Link>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product..."
            className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button type="submit" className="h-11 px-5 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }}
            className="h-11 px-3 rounded-[8px] border border-gray-200 text-muted-dark hover:bg-gray-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => {
          const count = t.key === "ALL" ? totalAll : (counts[t.key] ?? 0);
          return (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`flex-shrink-0 h-9 px-3 rounded-[6px] text-xs font-medium transition-colors ${
                statusFilter === t.key ? "bg-primary text-white" : "bg-white border border-gray-200 text-muted-dark hover:bg-gray-50"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`ml-1 ${statusFilter === t.key ? "text-white/70" : "text-muted"}`}>({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Offers */}
      {offersLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <Handshake className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">
            {search
              ? `No offers matching "${search}".`
              : statusFilter !== "ALL"
                ? "No offers in this status."
                : "No offers yet. Submit your first offer to supply agricultural products."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Quantity</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Price / Total</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden lg:table-cell">Submitted</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  const displayPrice = o.agreedPrice ?? o.counterPrice ?? o.offeredPrice;
                  const displayQty = o.agreedQuantity ?? o.counterQuantity ?? o.quantity;
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-agro-dark">{o.productName}</td>
                      <td className="px-4 py-3 text-muted-dark">{displayQty} {o.unit}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-agro-dark">{formatCurrency(displayPrice)}<span className="text-muted font-normal">/{o.unit}</span></p>
                        <p className="text-xs text-muted-dark">{formatCurrency(displayPrice * displayQty)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell text-xs">{formatDate(new Date(o.createdAt))}</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/aggregator/portal/offers/${o.id}`}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-xs font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-gray-50">
            {offers.map((o) => {
              const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.PENDING;
              const StatusIcon = cfg.icon;
              const displayPrice = o.agreedPrice ?? o.counterPrice ?? o.offeredPrice;
              const displayQty = o.agreedQuantity ?? o.counterQuantity ?? o.quantity;
              return (
                <Link
                  key={o.id}
                  href={`/aggregator/portal/offers/${o.id}`}
                  className="block p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-agro-dark truncate">{o.productName}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {displayQty} {o.unit} · {formatDate(new Date(o.createdAt))}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-agro-dark text-sm">{formatCurrency(displayPrice)}<span className="text-muted font-normal text-xs">/{o.unit}</span></p>
                      <p className="text-xs text-muted-dark">Total: {formatCurrency(displayPrice * displayQty)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </div>
                </Link>
              );
            })}
          </div>

          <PaginationBar pagination={pagination} onPage={(p) => loadOffers(p)} />
        </div>
      )}
    </div>
  );
}
