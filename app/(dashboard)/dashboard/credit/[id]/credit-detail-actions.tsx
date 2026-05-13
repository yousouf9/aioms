"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Phone, MessageCircle, Printer, Share2 } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { CreditSale } from "@/components/dashboard/credit-manager";

interface Props {
  credit: CreditSale;
  warehouses: { id: string; name: string }[];
  shops: { id: string; name: string }[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  TRANSFER: "Bank Transfer",
  POS: "POS (Card)",
  ONLINE: "Online Payment",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  OTHER: "Other",
};

function buildReceiptHTML(credit: CreditSale): string {
  const totalAmount = credit.totalAmount;
  const paidAmount = credit.paidAmount;
  const outstanding = totalAmount - paidAmount;
  const statusLabel: Record<string, string> = {
    ACTIVE: "Active", PARTIALLY_PAID: "Partially Paid", PAID: "Paid",
    OVERDUE: "Overdue", DEFAULTED: "Defaulted", RETURNED: "Returned",
  };

  const itemsRows = credit.items.map((item) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.product.name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₦${item.unitPrice.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">₦${item.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
    </tr>`).join("");

  const paymentsSection = credit.payments.length > 0 ? `
    <h3 style="font-size:13px;margin:16px 0 8px;font-family:sans-serif;">Payment History</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:sans-serif;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">Date</th>
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">Method</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${credit.payments.map((p) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${new Date(p.createdAt).toLocaleDateString("en-NG")}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${METHOD_LABELS[p.method] ?? p.method}${p.reference ? ` (${p.reference})` : ""}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#15803d;">₦${p.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Credit Receipt — ${credit.customer.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; max-width: 600px; margin: 0 auto; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #1B2631;padding-bottom:16px;">
    <h1 style="font-size:20px;font-weight:bold;color:#1B2631;">NAKOWA</h1>
    <p style="font-size:11px;color:#666;margin-top:4px;">No. 42 Behind Romantic Bakery, Anguwan Jaba, Lafia, Nasarawa State</p>
    <p style="font-size:11px;color:#666;">Call: 08088666857 &nbsp;|&nbsp; WhatsApp: 08030616849</p>
    <p style="font-size:11px;color:#666;">nakowa.com.ng</p>
  </div>

  <h2 style="font-size:15px;font-weight:bold;text-align:center;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;">Credit Sale Receipt</h2>

  <table style="width:100%;font-size:12px;margin-bottom:16px;">
    <tr>
      <td style="padding:3px 0;color:#666;width:40%;">Customer:</td>
      <td style="padding:3px 0;font-weight:bold;">${credit.customer.name}</td>
    </tr>
    ${credit.customer.phone ? `<tr><td style="padding:3px 0;color:#666;">Phone:</td><td style="padding:3px 0;">${credit.customer.phone}</td></tr>` : ""}
    <tr>
      <td style="padding:3px 0;color:#666;">Date Issued:</td>
      <td style="padding:3px 0;">${new Date(credit.createdAt).toLocaleDateString("en-NG")}</td>
    </tr>
    ${credit.dueDate ? `<tr><td style="padding:3px 0;color:#666;">Due Date:</td><td style="padding:3px 0;">${new Date(credit.dueDate).toLocaleDateString("en-NG")}</td></tr>` : ""}
    ${credit.season ? `<tr><td style="padding:3px 0;color:#666;">Season:</td><td style="padding:3px 0;">${credit.season}</td></tr>` : ""}
    <tr>
      <td style="padding:3px 0;color:#666;">Type:</td>
      <td style="padding:3px 0;">${credit.creditType === "FIXED_DATE" ? "Fixed Date" : "Seasonal"}</td>
    </tr>
    <tr>
      <td style="padding:3px 0;color:#666;">Status:</td>
      <td style="padding:3px 0;font-weight:bold;">${statusLabel[credit.status] ?? credit.status}</td>
    </tr>
  </table>

  <h3 style="font-size:13px;margin:0 0 8px;font-family:sans-serif;">Items</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">Product</th>
        <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;">Qty</th>
        <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;">Unit Price</th>
        <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;">Total</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
    <tfoot>
      <tr style="background:#f5f5f5;">
        <td colspan="3" style="padding:6px 8px;font-weight:bold;border-top:2px solid #ddd;">Total</td>
        <td style="padding:6px 8px;font-weight:bold;border-top:2px solid #ddd;text-align:right;">₦${totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>

  ${paymentsSection}

  <div style="margin-top:20px;padding:12px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span style="color:#666;">Total Amount:</span>
      <span style="font-weight:bold;">₦${totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span style="color:#666;">Amount Paid:</span>
      <span style="color:#15803d;font-weight:bold;">₦${paidAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:8px;margin-top:4px;">
      <span style="font-weight:bold;">Outstanding Balance:</span>
      <span style="color:${outstanding > 0 ? "#dc2626" : "#15803d"};font-weight:bold;">₦${outstanding.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  ${credit.notes ? `<p style="margin-top:12px;font-size:11px;color:#666;">Notes: ${credit.notes}</p>` : ""}

  <p style="text-align:center;font-size:10px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
    Powered by Lifeline Solutions &nbsp;|&nbsp; nakowa.com.ng
  </p>
</body>
</html>`;
}

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
              {[
                { value: "CASH", label: "Cash" },
                { value: "TRANSFER", label: "Bank Transfer" },
                { value: "POS", label: "POS (Card)" },
                { value: "ONLINE", label: "Online Payment" },
              ].map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
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

  const phone = credit.customer.phone?.replace(/\D/g, "") ?? "";
  const outstanding = credit.totalAmount - credit.paidAmount;

  const whatsappReminderText = encodeURIComponent(
    `Hello ${credit.customer.name}, this is a reminder about your outstanding balance of ₦${outstanding.toLocaleString("en-NG", { minimumFractionDigits: 2 })} with Nakowa. Kindly make arrangements to settle. Thank you.`
  );

  function handlePrint() {
    const html = buildReceiptHTML(credit);
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  function handleShareWhatsApp() {
    const outstanding = credit.totalAmount - credit.paidAmount;
    const itemsList = credit.items.map((i) => `• ${i.product.name} x${i.quantity} = ₦${i.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`).join("\n");
    const paymentsList = credit.payments.length > 0
      ? "\n\n*Payment History:*\n" + credit.payments.map((p) => `• ${new Date(p.createdAt).toLocaleDateString("en-NG")} — ₦${p.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} (${METHOD_LABELS[p.method] ?? p.method})`).join("\n")
      : "";
    const msg = `*NAKOWA — Credit Receipt*\n\nCustomer: ${credit.customer.name}\nDate: ${new Date(credit.createdAt).toLocaleDateString("en-NG")}\nStatus: ${credit.status.replace(/_/g, " ")}\n\n*Items:*\n${itemsList}${paymentsList}\n\n*Total: ₦${credit.totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}*\nPaid: ₦${credit.paidAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}\n*Outstanding: ₦${outstanding.toLocaleString("en-NG", { minimumFractionDigits: 2 })}*\n\nnakowa.com.ng`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 pb-8">
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
        <button
          onClick={handlePrint}
          className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <Printer className="h-4 w-4 text-muted" />
          Print Receipt
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="h-11 px-4 rounded-[8px] border border-green-200 bg-green-50 text-green-700 font-body text-sm hover:bg-green-100 transition-colors flex items-center gap-1.5"
        >
          <Share2 className="h-4 w-4" />
          Share Receipt
        </button>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Phone className="h-4 w-4 text-muted" />
            Call
          </a>
        )}
        {phone && (
          <a
            href={`https://wa.me/${phone}?text=${whatsappReminderText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-[8px] border border-amber-200 bg-amber-50 text-amber-700 font-body text-sm hover:bg-amber-100 transition-colors flex items-center gap-1.5"
          >
            <MessageCircle className="h-4 w-4" />
            Remind
          </a>
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
