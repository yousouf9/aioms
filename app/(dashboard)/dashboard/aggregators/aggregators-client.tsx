"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Handshake,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  Eye,
  ShieldCheck,
  ShieldX,
  Clock,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  FileSignature,
  PackageCheck,
  CircleCheckBig,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

type AggUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  profileImageUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  offersCount: number;
};

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
  dealValue: number;
  createdAt: string;
  customer: { id: string; name: string; phone: string };
  _count: { deliveries: number };
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

/* ── Status config ─────────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  COUNTERED: { label: "Countered", color: "bg-blue-100 text-blue-700", icon: ArrowRightLeft },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  AGREEMENT_SENT: { label: "Doc Sent", color: "bg-indigo-100 text-indigo-700", icon: FileSignature },
  AGREEMENT_UPLOADED: { label: "Review", color: "bg-orange-100 text-orange-700", icon: Clock },
  AGREEMENT_SIGNED: { label: "Signed", color: "bg-purple-100 text-purple-700", icon: FileSignature },
  SUPPLIED: { label: "Supplied", color: "bg-teal-100 text-teal-700", icon: PackageCheck },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CircleCheckBig },
};

const OFFER_STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "COUNTERED", label: "Countered" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "AGREEMENT_SENT", label: "Doc Sent" },
  { key: "AGREEMENT_UPLOADED", label: "Review" },
  { key: "AGREEMENT_SIGNED", label: "Signed" },
  { key: "SUPPLIED", label: "Supplied" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
];

/* ── Pagination component ──────────────────────────────────────── */

function PaginationBar({ pagination, onPage }: { pagination: Pagination; onPage: (p: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
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

/* ── Main component ────────────────────────────────────────────── */

export default function AggregatorsClient() {
  const [tab, setTab] = useState<"users" | "offers">("offers");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Handshake className="h-6 w-6 text-primary" />
        <h1 className="font-display text-xl font-bold text-agro-dark">Aggregator Management</h1>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        <button
          onClick={() => setTab("offers")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "offers" ? "border-primary text-primary" : "border-transparent text-muted-dark hover:text-agro-dark"
          }`}
        >
          <FileText className="h-4 w-4" /> Offers
        </button>
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-dark hover:text-agro-dark"
          }`}
        >
          <Users className="h-4 w-4" /> Aggregators
        </button>
      </div>

      {tab === "users" ? <UsersTab /> : <OffersTab />}
    </div>
  );
}

/* ── Users Tab ─────────────────────────────────────────────────── */

function UsersTab() {
  const [users, setUsers] = useState<AggUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/dashboard/aggregators/users?${params}`);
      const data = await res.json();
      if (data.success) { setUsers(data.data); setPagination(data.pagination); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary" />
        </div>
        <button type="submit" className="h-11 px-5 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }}
            className="h-11 px-3 rounded-[8px] border border-gray-200 text-muted-dark hover:bg-gray-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted">{search ? `No aggregators matching "${search}".` : "No registered aggregators yet."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden md:table-cell">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Verified</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Offers</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden lg:table-cell">Joined</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.profileImageUrl ? (
                          <img src={u.profileImageUrl} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="font-display font-bold text-primary text-xs">{u.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <span className="font-medium text-agro-dark">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-dark">{u.phone}</td>
                    <td className="px-4 py-3 text-muted-dark hidden md:table-cell">{u.email || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {u.isEmailVerified ? (
                        <ShieldCheck className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <ShieldX className="h-4 w-4 text-amber-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-agro-dark">{u.offersCount}</td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">{formatDate(new Date(u.createdAt))}</td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/dashboard/aggregators/${u.id}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-xs font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <PaginationBar pagination={pagination} onPage={(p) => load(p)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Offers Tab ────────────────────────────────────────────────── */

function OffersTab() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/dashboard/aggregators?${params}`);
      const data = await res.json();
      if (data.success) {
        setOffers(data.data);
        setPagination(data.pagination);
        setCounts(data.counts || {});
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const totalAll = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <div>
      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by aggregator name, phone, or product..."
            className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary" />
        </div>
        <button type="submit" className="h-11 px-5 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }}
            className="h-11 px-3 rounded-[8px] border border-gray-200 text-muted-dark hover:bg-gray-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {OFFER_STATUS_TABS.map((t) => {
          const count = t.key === "ALL" ? totalAll : (counts[t.key] ?? 0);
          return (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className={`flex-shrink-0 h-9 px-3 rounded-[6px] text-xs font-medium transition-colors ${
                statusFilter === t.key ? "bg-primary text-white" : "bg-white border border-gray-200 text-muted-dark hover:bg-gray-50"
              }`}>
              {t.label}{count > 0 && <span className={`ml-1 ${statusFilter === t.key ? "text-white/70" : "text-muted"}`}>({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <Handshake className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted">{search ? `No offers matching "${search}".` : "No offers found."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Aggregator</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden md:table-cell">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Price/Total</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden lg:table-cell">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  const displayPrice = o.agreedPrice ?? o.counterPrice ?? o.offeredPrice;

                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-agro-dark">{o.customer.name}</p>
                          <p className="text-xs text-muted">{o.customer.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-agro-dark">{o.productName}</td>
                      <td className="px-4 py-3 text-muted-dark hidden md:table-cell">
                        {o.agreedQuantity ?? o.quantity} {o.unit}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-agro-dark">{formatCurrency(displayPrice)}<span className="text-muted font-normal">/{o.unit}</span></p>
                        <p className="text-xs text-muted-dark">{formatCurrency(displayPrice * (o.agreedQuantity ?? o.quantity))}</p>
                        {o.agreedPrice && o.offeredPrice !== o.agreedPrice && (
                          <p className="text-[10px] text-muted line-through">{formatCurrency(o.offeredPrice)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell text-xs">{formatDate(new Date(o.createdAt))}</td>
                      <td className="px-4 py-3 text-center">
                        <Link href={`/dashboard/aggregators/offers/${o.id}`}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-xs font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <PaginationBar pagination={pagination} onPage={(p) => load(p)} />
          </div>
        </div>
      )}
    </div>
  );
}
