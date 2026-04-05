"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, UserCheck } from "lucide-react";

type CustomerRole = "BUYER" | "DEBTOR" | "AGGREGATOR";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  roles: CustomerRole[];
  notes?: string | null;
  _count: { orders: number; creditSales: number; aggregatorOffers: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Props {
  initialCustomers: Customer[];
  initialPagination: Pagination;
}

const ROLE_OPTIONS: CustomerRole[] = ["BUYER", "DEBTOR", "AGGREGATOR"];

function roleBadgeClass(role: CustomerRole) {
  if (role === "BUYER") return "bg-blue-100 text-blue-700";
  if (role === "DEBTOR") return "bg-amber-100 text-amber-700";
  return "bg-purple-100 text-purple-700";
}

export function CustomersManager({ initialCustomers, initialPagination }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | CustomerRole>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchCustomers(page, debouncedSearch, roleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, roleFilter]);

  async function fetchCustomers(p: number, q: string, role: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      params.set("page", String(p));
      params.set("pageSize", "20");
      const res = await fetch(`/api/dashboard/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
        setPagination(data.pagination);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleCreated() {
    setShowAdd(false);
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("");
    setPage(1);
    fetchCustomers(1, "", "");
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display font-bold text-2xl text-agro-dark">Customers</h1>
            <p className="font-body text-sm text-muted mt-0.5">
              {pagination.total} customer{pagination.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 sm:max-w-xs h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | CustomerRole)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <UserCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">
            {debouncedSearch || roleFilter
              ? "No customers match your filter."
              : "No customers yet. They'll appear here when orders are placed or created manually."}
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${loading ? "opacity-60" : ""}`}>
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4 hover:border-primary hover:shadow-md transition-all"
            >
              <h3 className="font-display font-semibold text-agro-dark">{c.name}</h3>
              <p className="text-muted text-xs">{c.phone}</p>
              {c.email && <p className="text-muted text-xs">{c.email}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.roles.map((r) => (
                  <span key={r} className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${roleBadgeClass(r)}`}>
                    {r}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                <span>{c._count.orders} order(s)</span>
                <span>{c._count.creditSales} credit(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1 || loading}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <p className="font-body text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {showAdd && (
        <CustomerFormModal onClose={() => setShowAdd(false)} onSaved={handleCreated} />
      )}
    </div>
  );
}

function CustomerFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [roles, setRoles] = useState<CustomerRole[]>(["BUYER"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleRole(role: CustomerRole) {
    setRoles((rs) => (rs.includes(role) ? rs.filter((r) => r !== role) : [...rs, role]));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roles: roles.length > 0 ? roles : ["BUYER"] }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save");
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
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Customer</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Phone *</label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1.5">Roles</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ROLE_OPTIONS.map((r) => {
                const checked = roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`h-10 rounded-[8px] font-body text-xs font-medium transition-colors border ${
                      checked
                        ? "bg-agro-dark text-frost-white border-transparent"
                        : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
