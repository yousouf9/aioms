"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck, Phone, Mail, MapPin, PackagePlus, CreditCard, ExternalLink, Upload, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface DeliveryItem {
  id: string;
  product: { id: string; name: string; unit: string };
  warehouse: { id: string; name: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
  deliveredAt: string;
  recordedBy: { name: string } | null;
  amountPaid: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  receiptUrl: string | null;
  notes: string | null;
  paidAt: string;
  delivery: { id: string; product: { name: string } } | null;
}

interface SupplierData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  totalDelivered: number;
  totalPaid: number;
  balance: number;
  deliveries: DeliveryItem[];
  payments: PaymentItem[];
}

interface Props {
  supplier: SupplierData;
  warehouses: { id: string; name: string }[];
  products: { id: string; name: string; unit: string; costPrice: number }[];
}

type Tab = "DELIVERIES" | "PAYMENTS";

export function SupplierDetail({ supplier, warehouses, products }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("DELIVERIES");
  const [showDelivery, setShowDelivery] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/suppliers" className="inline-flex items-center gap-2 text-sm text-muted hover:text-agro-dark font-body">
        <ArrowLeft className="h-4 w-4" />
        Back to Suppliers
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-[8px] bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-agro-dark">{supplier.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted font-body">
                <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" />{supplier.phone}</a>
                {supplier.email && <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" />{supplier.email}</a>}
                {supplier.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{supplier.address}</span>}
              </div>
            </div>
          </div>
          <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium shrink-0", supplier.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
            {supplier.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[12px] border border-gray-200 p-4">
          <p className="text-xs text-muted font-body uppercase tracking-wide">Total Supplied</p>
          <p className="font-display text-lg font-bold text-agro-dark mt-1">{formatCurrency(supplier.totalDelivered)}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 p-4">
          <p className="text-xs text-muted font-body uppercase tracking-wide">Total Paid</p>
          <p className="font-display text-lg font-bold text-green-600 mt-1">{formatCurrency(supplier.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 p-4">
          <p className="text-xs text-muted font-body uppercase tracking-wide">Balance Owed</p>
          <p className={cn("font-display text-lg font-bold mt-1", supplier.balance > 0 ? "text-red-600" : "text-green-600")}>
            {supplier.balance > 0 ? formatCurrency(supplier.balance) : "Settled"}
          </p>
        </div>
        <div className={cn("bg-white rounded-[12px] border p-4", supplier.balance < 0 ? "border-amber-200 bg-amber-50" : "border-gray-200")}>
          <p className="text-xs text-muted font-body uppercase tracking-wide">Overpaid</p>
          <p className={cn("font-display text-lg font-bold mt-1", supplier.balance < 0 ? "text-amber-700" : "text-agro-dark")}>
            {supplier.balance < 0 ? formatCurrency(Math.abs(supplier.balance)) : "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-[10px] w-fit">
            {(["DELIVERIES", "PAYMENTS"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-3 h-9 rounded-[8px] font-body text-sm font-medium transition-colors",
                  tab === t ? "bg-white text-agro-dark shadow-sm" : "text-muted hover:text-agro-dark")}>
                {t === "DELIVERIES" ? `Deliveries (${supplier.deliveries.length})` : `Payments (${supplier.payments.length})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPayment(true)}
              className="flex items-center gap-1.5 h-11 px-3 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors">
              <CreditCard className="h-4 w-4" /> Payment
            </button>
            <button onClick={() => setShowDelivery(true)}
              className="flex items-center gap-1.5 h-11 px-3 rounded-[8px] bg-primary text-white font-body text-sm hover:bg-primary/90 transition-colors">
              <PackagePlus className="h-4 w-4" /> Delivery
            </button>
          </div>
        </div>

        {tab === "DELIVERIES" && (
          supplier.deliveries.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-muted text-sm font-body">No deliveries recorded yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Product", "Warehouse", "Qty", "Unit Cost", "Total", "Paid", "Balance", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplier.deliveries.map((d) => {
                    const bal = d.totalCost - d.amountPaid;
                    return (
                      <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-body text-agro-dark font-medium">{d.product.name}</td>
                        <td className="px-4 py-3 text-muted font-body">{d.warehouse.name}</td>
                        <td className="px-4 py-3 font-body text-agro-dark">{d.quantity.toLocaleString()} <span className="text-muted text-xs">{d.product.unit.toLowerCase()}</span></td>
                        <td className="px-4 py-3 font-body text-agro-dark">{formatCurrency(d.unitCost)}</td>
                        <td className="px-4 py-3 font-display font-semibold text-agro-dark">{formatCurrency(d.totalCost)}</td>
                        <td className="px-4 py-3 text-green-600 font-body">{formatCurrency(d.amountPaid)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("font-body text-sm", bal > 0 ? "text-red-600" : "text-green-600")}>
                            {bal > 0 ? formatCurrency(bal) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">{formatDate(d.deliveredAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {supplier.deliveries.map((d) => {
                  const bal = d.totalCost - d.amountPaid;
                  return (
                    <div key={d.id} className="p-4">
                      <div className="flex justify-between mb-1">
                        <p className="font-body font-medium text-agro-dark">{d.product.name}</p>
                        <p className="font-display font-bold text-agro-dark">{formatCurrency(d.totalCost)}</p>
                      </div>
                      <p className="text-xs text-muted">{d.warehouse.name} · {d.quantity} {d.product.unit.toLowerCase()} @ {formatCurrency(d.unitCost)}</p>
                      <div className="flex justify-between mt-2 text-xs">
                        <span className="text-green-600">Paid: {formatCurrency(d.amountPaid)}</span>
                        <span className={bal > 0 ? "text-red-600" : "text-green-600"}>Bal: {bal > 0 ? formatCurrency(bal) : "—"}</span>
                        <span className="text-muted">{formatDate(d.deliveredAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {tab === "PAYMENTS" && (
          supplier.payments.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-muted text-sm font-body">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Amount", "Method", "Reference", "For Delivery", "Receipt", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplier.payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-display font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 font-body text-agro-dark capitalize">{p.method.toLowerCase()}</td>
                      <td className="px-4 py-3 font-body text-muted">{p.reference || "—"}</td>
                      <td className="px-4 py-3 font-body text-muted">{p.delivery ? p.delivery.product.name : "General"}</td>
                      <td className="px-4 py-3">
                        {p.receiptUrl ? (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{formatDate(p.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="md:hidden divide-y divide-gray-100">
                {supplier.payments.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-green-600">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted mt-0.5 capitalize">{p.method.toLowerCase()} · {p.delivery ? p.delivery.product.name : "General"}</p>
                      {p.receiptUrl && (
                        <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                          View Receipt <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted">{formatDate(p.paidAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {showDelivery && (
        <RecordDeliveryModal
          supplierId={supplier.id}
          warehouses={warehouses}
          products={products}
          onClose={() => setShowDelivery(false)}
          onSaved={() => { setShowDelivery(false); router.refresh(); }}
        />
      )}

      {showPayment && (
        <RecordPaymentModal
          supplierId={supplier.id}
          deliveries={supplier.deliveries}
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function RecordDeliveryModal({
  supplierId, warehouses, products, onClose, onSaved,
}: {
  supplierId: string;
  warehouses: { id: string; name: string }[];
  products: { id: string; name: string; unit: string; costPrice: number }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    warehouseId: warehouses[0]?.id ?? "",
    quantity: 1,
    unitCost: products[0]?.costPrice ?? 0,
    notes: "",
    addToStock: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = products.find((p) => p.id === form.productId);

  function handleProductChange(productId: string) {
    const p = products.find((x) => x.id === productId);
    setForm((f) => ({ ...f, productId, unitCost: p?.costPrice ?? 0 }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/suppliers/${supplierId}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          <h2 className="font-display font-bold text-lg text-agro-dark">Record Delivery</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Product *</label>
            <select value={form.productId} onChange={(e) => handleProductChange(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Warehouse *</label>
            <select value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors">
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs text-muted mb-1">Quantity ({selectedProduct?.unit.toLowerCase() ?? "units"}) *</label>
              <input type="number" min={1} value={form.quantity || ""}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setForm((f) => ({ ...f, quantity: v })); }}
                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) setForm((f) => ({ ...f, quantity: 1 })); }}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">Unit Cost (₦) *</label>
              <input type="number" min={0} step="0.01" value={form.unitCost || ""}
                onChange={(e) => { const v = parseFloat(e.target.value); setForm((f) => ({ ...f, unitCost: isNaN(v) ? 0 : v })); }}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-[8px] px-3 py-2">
            <p className="font-body text-xs text-muted">Total Cost</p>
            <p className="font-display font-bold text-agro-dark">{formatCurrency(form.quantity * form.unitCost)}</p>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.addToStock} onChange={(e) => setForm((f) => ({ ...f, addToStock: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary" />
            <span className="font-body text-sm text-agro-dark">Add to warehouse stock immediately</span>
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Record Delivery"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  supplierId, deliveries, onClose, onSaved,
}: {
  supplierId: string;
  deliveries: DeliveryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    amount: 0,
    method: "CASH",
    reference: "",
    notes: "",
    deliveryId: "",
  });
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleReceiptUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError("Receipt image must be under 5 MB"); return; }
    setUploading(true);
    setError("");
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) { setError("Image upload not configured"); return; }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      fd.append("folder", "supplier-receipts");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.secure_url) setReceiptUrl(data.secure_url);
      else setError("Receipt upload failed");
    } catch {
      setError("Receipt upload failed");
    } finally {
      setUploading(false);
    }
  }

  const unpaidDeliveries = deliveries.filter((d) => d.totalCost - d.amountPaid > 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) { setError("Enter a valid amount."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/suppliers/${supplierId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: form.amount, method: form.method, reference: form.reference || undefined, receiptUrl: receiptUrl || undefined, notes: form.notes || undefined, deliveryId: form.deliveryId || undefined }),
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
          <h2 className="font-display font-bold text-lg text-agro-dark">Record Payment</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Amount (₦) *</label>
            <input type="number" min={1} step="0.01" value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Payment Method</label>
            <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors">
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Bank Transfer</option>
              <option value="POS">POS</option>
            </select>
          </div>
          {unpaidDeliveries.length > 0 && (
            <div>
              <label className="block font-body text-xs text-muted mb-1">Apply to Delivery (optional)</label>
              <select value={form.deliveryId} onChange={(e) => {
                const d = deliveries.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, deliveryId: e.target.value, amount: d ? d.totalCost - d.amountPaid : f.amount }));
              }}
                className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors">
                <option value="">— General payment —</option>
                {unpaidDeliveries.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.product.name} · Bal: {formatCurrency(d.totalCost - d.amountPaid)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Reference</label>
            <input type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Transaction ref / receipt no."
              className="w-full h-11 px-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Payment Receipt (optional)</label>
            {receiptUrl ? (
              <div className="flex items-center gap-2 h-11 px-3 rounded-[8px] border border-green-200 bg-green-50">
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-green-700 font-body truncate hover:underline">
                  Receipt uploaded — tap to view
                </a>
                <button type="button" onClick={() => setReceiptUrl("")} className="text-xs text-muted hover:text-red-500">✕</button>
              </div>
            ) : (
              <label className={cn("flex items-center justify-center gap-2 h-11 px-3 rounded-[8px] border border-dashed border-gray-300 cursor-pointer hover:border-primary/60 transition-colors", uploading && "opacity-60 pointer-events-none")}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : <Upload className="h-4 w-4 text-muted" />}
                <span className="font-body text-sm text-muted">{uploading ? "Uploading…" : "Upload receipt image"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
              </label>
            )}
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors resize-none" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
