"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type CreditStatus = "ACTIVE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "DEFAULTED" | "RETURNED";

interface CreditItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: { name: string };
}

interface CreditPaymentRecord {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreditSale {
  id: string;
  customerId: string;
  creditType: "FIXED_DATE" | "SEASONAL";
  totalAmount: number;
  paidAmount: number;
  dueDate: string | null;
  season: string | null;
  status: CreditStatus;
  returnedToInventory: boolean;
  notes: string | null;
  createdAt: string;
  customer: { name: string; phone: string };
  items: CreditItem[];
  payments: CreditPaymentRecord[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Props {
  initialCredits: CreditSale[];
  initialPagination: Pagination;
  warehouses: { id: string; name: string }[];
  shops: { id: string; name: string }[];
}

const STATUS_COLORS: Record<CreditStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DEFAULTED: "bg-red-200 text-red-800",
  RETURNED: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<CreditStatus, string> = {
  ACTIVE: "Active",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  DEFAULTED: "Defaulted",
  RETURNED: "Returned",
};

export function CreditManager({ initialCredits, initialPagination, warehouses, shops }: Props) {
  const router = useRouter();
  const [credits, setCredits] = useState<CreditSale[]>(initialCredits);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | CreditStatus>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [payCredit, setPayCredit] = useState<CreditSale | null>(null);
  const [returnCredit, setReturnCredit] = useState<CreditSale | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchCredits(page, debouncedSearch, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter]);

  async function fetchCredits(p: number, q: string, status: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: "20" });
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const res = await fetch(`/api/dashboard/credit?${params}`);
      const data = await res.json();
      if (data.success) { setCredits(data.data); setPagination(data.pagination); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  function onCreated() { setShowNew(false); fetchCredits(1, debouncedSearch, statusFilter); setPage(1); }
  function onPaid() { setPayCredit(null); fetchCredits(page, debouncedSearch, statusFilter); router.refresh(); }
  function onReturned() { setReturnCredit(null); fetchCredits(page, debouncedSearch, statusFilter); router.refresh(); }

  const rangeStart = (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display font-bold text-xl text-agro-dark">Credit & Debt</h1>
            <p className="font-body text-sm text-muted mt-0.5">{pagination.total} record{pagination.total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> New Credit
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 sm:max-w-xs h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | CreditStatus)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as CreditStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {credits.length === 0 && !loading ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">
            {debouncedSearch || statusFilter ? "No records match your filter." : "No credit sales yet."}
          </p>
        </div>
      ) : (
        <div className={loading ? "opacity-60 pointer-events-none" : ""}>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Date", "Customer", "Type", "Items", "Total", "Paid", "Outstanding", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {credits.map((c) => {
                  const outstanding = c.totalAmount - c.paidAmount;
                  return (
                    <tr key={c.id} onClick={() => router.push(`/dashboard/credit/${c.id}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-body text-sm text-agro-dark whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-display font-semibold text-agro-dark">{c.customer.name}</p>
                        <p className="font-body text-xs text-muted">{c.customer.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium ${c.creditType === "FIXED_DATE" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {c.creditType === "FIXED_DATE" ? "Fixed Date" : "Seasonal"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark">{c.items.length}</td>
                      <td className="px-4 py-3 font-body text-sm text-agro-dark whitespace-nowrap">{formatCurrency(c.totalAmount)}</td>
                      <td className="px-4 py-3 font-body text-sm whitespace-nowrap">
                        <span className={c.paidAmount > 0 ? "text-green-700 font-medium" : "text-muted"}>{formatCurrency(c.paidAmount)}</span>
                      </td>
                      <td className="px-4 py-3 font-body text-sm whitespace-nowrap">
                        <span className={outstanding > 0 ? "text-red-600 font-medium" : "text-muted"}>{formatCurrency(outstanding)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-[6px] px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {c.status !== "PAID" && c.status !== "RETURNED" && (
                            <button onClick={() => setPayCredit(c)}
                              className="h-8 px-3 rounded-[6px] bg-primary text-white font-body text-xs font-medium hover:bg-primary-dark transition-colors">
                              Pay
                            </button>
                          )}
                          {!c.returnedToInventory && c.status !== "PAID" && c.status !== "RETURNED" && (
                            <button onClick={() => setReturnCredit(c)}
                              className="h-8 px-3 rounded-[6px] border border-gray-200 text-agro-dark font-body text-xs hover:bg-gray-50 transition-colors">
                              Return
                            </button>
                          )}
                          <Link href={`/dashboard/credit/${c.id}`} onClick={(e) => e.stopPropagation()}
                            className="text-primary text-sm font-medium hover:underline whitespace-nowrap">
                            View →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="font-body text-xs text-muted">Showing {rangeStart}–{rangeEnd} of {pagination.total}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1}
                    className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-gray-200 text-agro-dark hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages}
                    className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-gray-200 text-agro-dark hover:bg-gray-50 disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {credits.map((c) => {
              const outstanding = c.totalAmount - c.paidAmount;
              return (
                <div key={c.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-display font-semibold text-agro-dark">{c.customer.name}</p>
                      <p className="text-muted text-xs">{c.customer.phone} · {c.creditType === "FIXED_DATE" ? "Fixed Date" : "Seasonal"}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-[6px] text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2 rounded-[8px] bg-gray-50">
                      <p className="text-xs text-muted">Total</p>
                      <p className="font-display font-semibold text-sm text-agro-dark">{formatCurrency(c.totalAmount)}</p>
                    </div>
                    <div className="p-2 rounded-[8px] bg-green-50">
                      <p className="text-xs text-muted">Paid</p>
                      <p className="font-display font-semibold text-sm text-green-700">{formatCurrency(c.paidAmount)}</p>
                    </div>
                    <div className="p-2 rounded-[8px] bg-red-50">
                      <p className="text-xs text-muted">Owed</p>
                      <p className="font-display font-semibold text-sm text-red-600">{formatCurrency(outstanding)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {c.status !== "PAID" && c.status !== "RETURNED" && (
                      <button onClick={() => setPayCredit(c)} className="h-11 flex-1 rounded-[8px] bg-primary text-white font-display font-semibold text-sm">
                        Record Payment
                      </button>
                    )}
                    <Link href={`/dashboard/credit/${c.id}`} className="h-11 px-4 flex items-center rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">
                      View →
                    </Link>
                  </div>
                </div>
              );
            })}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="font-body text-xs text-muted">Showing {rangeStart}–{rangeEnd} of {pagination.total}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1}
                    className="h-11 px-3 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages}
                    className="h-11 px-3 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showNew && <NewCreditModal warehouses={warehouses} shops={shops} onClose={() => setShowNew(false)} onCreated={onCreated} />}
      {payCredit && <RecordPaymentModal credit={payCredit} onClose={() => setPayCredit(null)} onPaid={onPaid} />}
      {returnCredit && <ReturnModal credit={returnCredit} warehouses={warehouses} shops={shops} onClose={() => setReturnCredit(null)} onReturned={onReturned} />}
    </div>
  );
}

// ─── New Credit Modal ──────────────────────────────────────────────────────────

interface ProductOption { id: string; name: string; sellingPrice: number; unit: string; }
interface CustomerOption { id: string; name: string; phone: string; }
interface LineItem { productId: string; productName: string; unit: string; quantity: number; unitPrice: number; }

function NewCreditModal({ warehouses, shops, onClose, onCreated }: {
  warehouses: { id: string; name: string }[];
  shops: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [lines, setLines] = useState<LineItem[]>([{ productId: "", productName: "", unit: "", quantity: 1, unitPrice: 0 }]);
  const [productSearches, setProductSearches] = useState<string[]>([""]);
  const [productResults, setProductResults] = useState<ProductOption[][]>([[]]);

  const [creditType, setCreditType] = useState<"FIXED_DATE" | "SEASONAL">("FIXED_DATE");
  const [dueDate, setDueDate] = useState("");
  const [season, setSeason] = useState("");
  const [sourceType, setSourceType] = useState<"warehouse" | "shop">("warehouse");
  const [sourceId, setSourceId] = useState(warehouses[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (customerDebounce.current) clearTimeout(customerDebounce.current);
    customerDebounce.current = setTimeout(async () => {
      if (!q.trim()) { setCustomerResults([]); return; }
      try {
        const res = await fetch(`/api/dashboard/customers?q=${encodeURIComponent(q)}&pageSize=8`);
        const data = await res.json();
        if (data.success) setCustomerResults(data.data);
      } catch { /* ignore */ }
    }, 300);
  }

  async function handleAddCustomer() {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    setAddingCustomer(true);
    try {
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim(), roles: ["BUYER"] }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer({ id: data.data.id, name: data.data.name, phone: data.data.phone });
        setCustomerSearch(""); setCustomerResults([]); setShowAddCustomer(false);
        setNewCustomerName(""); setNewCustomerPhone("");
      }
    } catch { /* ignore */ } finally { setAddingCustomer(false); }
  }

  async function searchProducts(idx: number, q: string) {
    const newSearches = [...productSearches];
    newSearches[idx] = q;
    setProductSearches(newSearches);
    if (!q.trim()) { const r = [...productResults]; r[idx] = []; setProductResults(r); return; }
    try {
      const res = await fetch(`/api/dashboard/inventory/products?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) { const r = [...productResults]; r[idx] = data.data.slice(0, 8); setProductResults(r); }
    } catch { /* ignore */ }
  }

  function selectProduct(idx: number, p: ProductOption) {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], productId: p.id, productName: p.name, unit: p.unit, unitPrice: p.sellingPrice };
    setLines(newLines);
    const newSearches = [...productSearches]; newSearches[idx] = p.name; setProductSearches(newSearches);
    const r = [...productResults]; r[idx] = []; setProductResults(r);
  }

  function addLine() {
    setLines([...lines, { productId: "", productName: "", unit: "", quantity: 1, unitPrice: 0 }]);
    setProductSearches([...productSearches, ""]);
    setProductResults([...productResults, []]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
    setProductSearches(productSearches.filter((_, i) => i !== idx));
    setProductResults(productResults.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: "quantity" | "unitPrice", value: number) {
    const newLines = [...lines]; newLines[idx] = { ...newLines[idx], [field]: value }; setLines(newLines);
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) { setError("Add at least one product"); return; }
    if (!sourceId) { setError("Select a source warehouse or shop"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/dashboard/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          creditType,
          dueDate: creditType === "FIXED_DATE" ? dueDate || null : null,
          season: creditType === "SEASONAL" ? season || null : null,
          notes: notes.trim() || null,
          items: validLines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
          warehouseId: sourceType === "warehouse" ? sourceId : undefined,
          shopId: sourceType === "shop" ? sourceId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) onCreated();
      else setError(data.error ?? "Failed to save");
    } catch { setError("Connection error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-lg bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">New Credit Sale</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Customer */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Customer *</label>
            {selectedCustomer ? (
              <div className="flex items-center gap-2 h-11 px-3 rounded-[8px] bg-gray-50 border border-gray-200">
                <span className="flex-1 font-body text-sm text-agro-dark">
                  {selectedCustomer.name} <span className="text-muted">· {selectedCustomer.phone}</span>
                </span>
                <button type="button" onClick={() => setSelectedCustomer(null)} className="text-muted hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input type="text" value={customerSearch} onChange={(e) => searchCustomers(e.target.value)}
                    placeholder="Search customer name or phone..."
                    className="w-full h-11 pl-9 pr-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary" />
                </div>
                {customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg overflow-hidden">
                    {customerResults.map((cu) => (
                      <button key={cu.id} type="button"
                        onClick={() => { setSelectedCustomer(cu); setCustomerSearch(""); setCustomerResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 font-body text-sm text-agro-dark">
                        {cu.name} <span className="text-muted text-xs">{cu.phone}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowAddCustomer(true)}
                      className="w-full text-left px-3 py-2 text-primary font-body text-sm border-t border-gray-100 hover:bg-gray-50">
                      + Add new customer
                    </button>
                  </div>
                )}
                {customerSearch.trim() && customerResults.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg">
                    <button type="button" onClick={() => { setShowAddCustomer(true); setNewCustomerName(customerSearch); }}
                      className="w-full text-left px-3 py-2 text-primary font-body text-sm hover:bg-gray-50">
                      + Add &ldquo;{customerSearch}&rdquo; as new customer
                    </button>
                  </div>
                )}
              </div>
            )}

            {showAddCustomer && (
              <div className="mt-2 p-3 rounded-[8px] bg-gray-50 border border-gray-200 space-y-2">
                <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide">New Customer</p>
                <input type="text" placeholder="Full name *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
                <input type="tel" placeholder="Phone number *" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddCustomer(false)} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-white">Cancel</button>
                  <button type="button" onClick={handleAddCustomer} disabled={addingCustomer || !newCustomerName.trim() || !newCustomerPhone.trim()}
                    className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
                    {addingCustomer ? "Adding..." : "Add Customer"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Items *</label>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input type="text" value={productSearches[idx]} onChange={(e) => searchProducts(idx, e.target.value)}
                        placeholder="Search product..."
                        className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
                      {(productResults[idx]?.length ?? 0) > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg max-h-40 overflow-y-auto">
                          {productResults[idx].map((p) => (
                            <button key={p.id} type="button" onClick={() => selectProduct(idx, p)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 font-body text-sm text-agro-dark">
                              {p.name} <span className="text-muted text-xs">· {formatCurrency(p.sellingPrice)}/{p.unit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="w-20 h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
                    <input type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => updateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                      className="w-28 h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(idx)} className="h-11 w-11 flex items-center justify-center rounded-[8px] border border-gray-200 text-muted hover:text-red-500 hover:border-red-200">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {line.productId && (
                    <p className="mt-0.5 px-1 text-xs text-muted">
                      {line.productName} · {line.unit} · Subtotal: {formatCurrency(line.quantity * line.unitPrice)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-2 h-9 px-3 rounded-[8px] border border-dashed border-gray-300 text-primary font-body text-sm hover:bg-gray-50">
              + Add item
            </button>
            <p className="mt-2 text-right font-display font-bold text-agro-dark">Total: {formatCurrency(total)}</p>
          </div>

          {/* Credit type */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Credit Type *</label>
            <div className="flex gap-2">
              {(["FIXED_DATE", "SEASONAL"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setCreditType(t)}
                  className={`flex-1 h-11 rounded-[8px] font-body text-sm font-medium border transition-colors ${creditType === t ? "bg-agro-dark text-white border-transparent" : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"}`}>
                  {t === "FIXED_DATE" ? "Fixed Date" : "Seasonal"}
                </button>
              ))}
            </div>
            {creditType === "FIXED_DATE" && (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}
                className="mt-2 w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
            )}
            {creditType === "SEASONAL" && (
              <input type="text" placeholder="e.g. 2024 Harvest" value={season} onChange={(e) => setSeason(e.target.value)}
                className="mt-2 w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
            )}
          </div>

          {/* Source */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Stock Source *</label>
            <div className="flex gap-2 mb-2">
              {(["warehouse", "shop"] as const).map((t) => (
                <button key={t} type="button"
                  onClick={() => { setSourceType(t); setSourceId(t === "warehouse" ? (warehouses[0]?.id ?? "") : (shops[0]?.id ?? "")); }}
                  className={`flex-1 h-11 rounded-[8px] font-body text-sm font-medium border transition-colors ${sourceType === t ? "bg-agro-dark text-white border-transparent" : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"}`}>
                  {t === "warehouse" ? "Warehouse" : "Shop"}
                </button>
              ))}
            </div>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
              {(sourceType === "warehouse" ? warehouses : shops).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Create Credit Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ──────────────────────────────────────────────────────

export function RecordPaymentModal({ credit, onClose, onPaid }: {
  credit: { id: string; totalAmount: number; paidAmount: number; customer: { name: string } };
  onClose: () => void;
  onPaid: () => void;
}) {
  const outstanding = credit.totalAmount - credit.paidAmount;
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/dashboard/credit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditSaleId: credit.id, amount: parsed, method, reference: reference.trim() || null, notes: notes.trim() || null }),
      });
      const data = await res.json();
      if (data.success) onPaid();
      else setError(data.error ?? "Failed to record payment");
    } catch { setError("Connection error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Record Payment</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div className="p-3 rounded-[8px] bg-gray-50 flex justify-between">
            <div>
              <p className="font-body text-xs text-muted">Customer</p>
              <p className="font-display font-semibold text-agro-dark">{credit.customer.name}</p>
            </div>
            <div className="text-right">
              <p className="font-body text-xs text-muted">Outstanding</p>
              <p className="font-display font-bold text-red-600 text-lg">{formatCurrency(outstanding)}</p>
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Amount (₦) *</label>
            <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Payment Method *</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
              {["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "OTHER"].map((m) => (
                <option key={m} value={m}>{m.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Reference</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ref / receipt no."
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary resize-none" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Return Modal ──────────────────────────────────────────────────────────────

export function ReturnModal({ credit, warehouses, shops, onClose, onReturned }: {
  credit: { id: string; customer: { name: string }; items: { id: string; quantity: number; product: { name: string } }[] };
  warehouses: { id: string; name: string }[];
  shops: { id: string; name: string }[];
  onClose: () => void;
  onReturned: () => void;
}) {
  const [destType, setDestType] = useState<"warehouse" | "shop">("warehouse");
  const [destId, setDestId] = useState(warehouses[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!destId) { setError("Select a destination"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/dashboard/credit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditSaleId: credit.id,
          action: "RETURN",
          warehouseId: destType === "warehouse" ? destId : undefined,
          shopId: destType === "shop" ? destId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) onReturned();
      else setError(data.error ?? "Failed to return");
    } catch { setError("Connection error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Return to Inventory</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleReturn} className="p-5 space-y-4">
          <p className="font-body text-sm text-agro-dark">
            Returning <span className="font-semibold">{credit.items.length} item(s)</span> from{" "}
            <span className="font-semibold">{credit.customer.name}</span> back to inventory.
          </p>
          <div className="space-y-1.5">
            {credit.items.map((item) => (
              <div key={item.id} className="flex justify-between font-body text-sm text-agro-dark px-3 py-2 rounded-[8px] bg-gray-50">
                <span>{item.product.name}</span>
                <span className="text-muted">× {item.quantity}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Return Destination *</label>
            <div className="flex gap-2 mb-2">
              {(["warehouse", "shop"] as const).map((t) => (
                <button key={t} type="button"
                  onClick={() => { setDestType(t); setDestId(t === "warehouse" ? (warehouses[0]?.id ?? "") : (shops[0]?.id ?? "")); }}
                  className={`flex-1 h-11 rounded-[8px] font-body text-sm font-medium border transition-colors ${destType === t ? "bg-agro-dark text-white border-transparent" : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"}`}>
                  {t === "warehouse" ? "Warehouse" : "Shop"}
                </button>
              ))}
            </div>
            <select value={destId} onChange={(e) => setDestId(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary">
              {(destType === "warehouse" ? warehouses : shops).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Returning..." : "Return to Inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
