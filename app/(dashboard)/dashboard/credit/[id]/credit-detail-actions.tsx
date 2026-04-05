"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { CreditSale } from "@/components/dashboard/credit-manager";

interface Props {
  credit: CreditSale;
  warehouses: { id: string; name: string }[];
  shops: { id: string; name: string }[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  OTHER: "Other",
};

function RecordPaymentModal({ credit, onClose, onSuccess }: { credit: CreditSale; onClose: () => void; onSuccess: () => void }) {
  const outstanding = credit.totalAmount - credit.paidAmount;
  const [amount, setAmount] = useState(String(outstanding > 0 ? outstanding : ""));
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid amount."); return; }
    if (parsed > outstanding + 0.001) { setError(`Amount exceeds outstanding (${formatCurrency(outstanding)}).`); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/credit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditSaleId: credit.id, amount: parsed, method, reference: reference || undefined, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Failed."); return; }
      onSuccess();
      onClose();
    } catch { setError("Network error."); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-agro-dark">Record Payment</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[8px] hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-muted" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-[8px] px-4 py-3">
            <p className="text-sm font-body text-agro-dark">Outstanding: <span className="font-bold text-red-700">{formatCurrency(outstanding)}</span></p>
          </div>
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Amount (₦) *</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full h-11 px-3 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Payment Method *</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-11 px-3 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors bg-white">
              {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Reference (optional)</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ref..." className="w-full h-11 px-3 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors resize-none" />
          </div>
          {error && <p className="text-red-600 text-xs font-body">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-body text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">{saving ? "Saving…" : "Record Payment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReturnModal({ credit, warehouses, shops, onClose, onSuccess }: { credit: CreditSale; warehouses: { id: string; name: string }[]; shops: { id: string; name: string }[]; onClose: () => void; onSuccess: () => void }) {
  const [locType, setLocType] = useState<"warehouse" | "shop">("warehouse");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const chosenWarehouse = locType === "warehouse" ? warehouseId : undefined;
    const chosenShop = locType === "shop" ? shopId : undefined;
    if (!chosenWarehouse && !chosenShop) { setError("Select a return location."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/credit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditSaleId: credit.id, action: "RETURN", warehouseId: chosenWarehouse, shopId: chosenShop }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Failed."); return; }
      onSuccess();
      onClose();
    } catch { setError("Network error."); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-agro-dark">Return to Inventory</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[8px] hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-muted" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-[8px] px-4 py-3 text-sm text-amber-800 font-body">
            This will return all items back into inventory and mark the sale as Returned.
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-agro-dark mb-1.5">Items being returned:</p>
            {credit.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm font-body text-agro-dark">
                <span>{item.product.name}</span>
                <span className="text-muted">x{item.quantity}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Return destination *</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setLocType("warehouse")} className={cn("flex-1 h-9 rounded-[8px] border text-sm font-body transition-colors", locType === "warehouse" ? "border-primary bg-primary/10 text-primary font-medium" : "border-gray-200 text-muted hover:bg-gray-50")}>Warehouse</button>
              <button type="button" onClick={() => setLocType("shop")} className={cn("flex-1 h-9 rounded-[8px] border text-sm font-body transition-colors", locType === "shop" ? "border-primary bg-primary/10 text-primary font-medium" : "border-gray-200 text-muted hover:bg-gray-50")}>Shop</button>
            </div>
            {locType === "warehouse" ? (
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full h-11 px-3 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors bg-white">
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            ) : (
              <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="w-full h-11 px-3 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors bg-white">
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          {error && <p className="text-red-600 text-xs font-body">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-amber-600 text-white font-body text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-colors">{saving ? "Processing…" : "Return Items"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreditDetailActions({ credit, warehouses, shops }: Props) {
  const router = useRouter();
  const [showPayment, setShowPayment] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const canPay = credit.status !== "PAID" && credit.status !== "RETURNED";
  const canReturn = !credit.returnedToInventory && credit.status !== "PAID" && credit.status !== "RETURNED";

  if (!canPay && !canReturn) return null;

  return (
    <>
      <div className="flex gap-3 pb-8">
        {canPay && (
          <button
            onClick={() => setShowPayment(true)}
            className="h-11 px-5 rounded-[8px] bg-primary text-white font-body text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Record Payment
          </button>
        )}
        {canReturn && (
          <button
            onClick={() => setShowReturn(true)}
            className="h-11 px-5 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors"
          >
            Return to Inventory
          </button>
        )}
      </div>

      {showPayment && (
        <RecordPaymentModal
          credit={credit}
          onClose={() => setShowPayment(false)}
          onSuccess={() => router.refresh()}
        />
      )}
      {showReturn && (
        <ReturnModal
          credit={credit}
          warehouses={warehouses}
          shops={shops}
          onClose={() => setShowReturn(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}
