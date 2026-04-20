"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle, Clock, Printer, MessageCircle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { StaffSession } from "@/types";

interface Product {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  totalStock: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleRecord {
  id: string;
  total: number;
  paymentMethod: string;
  createdAt: Date;
  itemCount: number;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
}

interface OpenSession {
  id: string;
  openedAt: Date;
  salesCount: number;
}

interface Props {
  session: StaffSession;
  openSession: OpenSession | null;
  products: Product[];
  recentSales: SaleRecord[];
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "POS", label: "POS" },
];

export function POSTerminal({ session, openSession: initialSession, products, recentSales: initialSales }: Props) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<OpenSession | null>(initialSession);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "POS">("CASH");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [sales, setSales] = useState(initialSales);
  const [showReceipt, setShowReceipt] = useState(false);

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchCat = categoryFilter === "ALL" || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.totalStock) return prev;
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.totalStock === 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);

  const openNewSession = useCallback(async () => {
    setSessionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/sales/sessions", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActiveSession({ id: data.data.id, openedAt: new Date(data.data.openedAt), salesCount: 0 });
      } else {
        setError(data.error ?? "Failed to open session");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const closeSession = useCallback(async () => {
    if (!activeSession) return;
    if (!confirm("Close this session? You can open a new one at any time.")) return;
    setSessionLoading(true);
    try {
      await fetch(`/api/dashboard/sales/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close: true }),
      });
      setActiveSession(null);
      setCart([]);
      router.refresh();
    } finally {
      setSessionLoading(false);
    }
  }, [activeSession, router]);

  async function handleSale() {
    if (!activeSession || cart.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          paymentMethod,
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const sale: SaleRecord = {
          id: data.data.id,
          total: data.data.total,
          paymentMethod,
          createdAt: new Date(data.data.createdAt),
          itemCount: cart.reduce((sum, i) => sum + i.quantity, 0),
          items: cart.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: i.product.sellingPrice,
            total: i.product.sellingPrice * i.quantity,
          })),
        };
        setLastSale(sale);
        setSales((prev) => [sale, ...prev.slice(0, 9)]);
        setActiveSession((s) => s ? { ...s, salesCount: s.salesCount + 1 } : s);
        setCart([]);
        setShowReceipt(true);
        router.refresh();
      } else {
        setError(data.error ?? "Sale failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrintReceipt() {
    if (!lastSale) return;
    const win = window.open("", "_blank", "width=360,height=600");
    if (!win) return;
    const lines = lastSale.items.map((i) => `<tr><td>${i.name} &times; ${i.quantity}</td><td style="text-align:right">&#8358;${i.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td></tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:sans-serif;padding:20px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}td{padding:4px 0}tfoot td{border-top:1px solid #ccc;font-weight:bold;padding-top:8px}.header{text-align:center;margin-bottom:16px}.footer{text-align:center;margin-top:16px;font-size:12px;color:#888}</style></head><body><div class="header"><h2 style="margin:0">Nakowa</h2><p style="margin:4px 0;font-size:12px">${new Date().toLocaleString("en-NG")}</p><p style="margin:4px 0;font-size:12px">Payment: ${lastSale.paymentMethod}</p></div><table><tbody>${lines}</tbody><tfoot><tr><td>Total</td><td style="text-align:right">&#8358;${lastSale.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td></tr></tfoot></table><div class="footer"><p>Thank you for your business!</p></div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function handleWhatsAppShare() {
    if (!lastSale) return;
    const lines = lastSale.items.map((i) => `• ${i.name} x${i.quantity} — ₦${i.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`).join("\n");
    const msg = `*Nakowa Receipt*\n${new Date().toLocaleString("en-NG")}\nPayment: ${lastSale.paymentMethod}\n\n${lines}\n\n*Total: ₦${lastSale.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}*\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // No session — show open session prompt
  if (!activeSession) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-agro-dark">Sales / POS</h1>
          <p className="font-body text-sm text-muted mt-0.5">Open a session to start recording sales</p>
        </div>

        <div className="max-w-sm bg-white rounded-[12px] border border-gray-200 shadow-card p-8 text-center mx-auto">
          <ShoppingCart className="h-10 w-10 text-muted mx-auto mb-3" />
          <h2 className="font-display font-bold text-lg text-agro-dark mb-1">No Open Session</h2>
          <p className="font-body text-sm text-muted mb-6">Open a sale session to begin recording transactions</p>
          {error && <p className="text-status-cancelled text-sm mb-3">{error}</p>}
          <button
            onClick={openNewSession}
            disabled={sessionLoading}
            className="w-full h-12 rounded-[8px] bg-primary text-agro-dark font-display font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {sessionLoading ? "Opening…" : "Open Session"}
          </button>
        </div>

        {/* Recent sales history */}
        {sales.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display font-semibold text-lg text-agro-dark mb-3">Recent Sales (Today)</h2>
            <SalesHistory sales={sales} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Sales / POS</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-body text-sm text-muted">
              Session open · {activeSession.salesCount} sale{activeSession.salesCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          onClick={closeSession}
          disabled={sessionLoading}
          className="h-10 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Close Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Left: Product grid */}
        <div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 flex-1 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <div className="flex gap-1 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "h-11 px-3 rounded-[8px] font-body text-sm whitespace-nowrap transition-colors shrink-0",
                    categoryFilter === cat
                      ? "bg-agro-dark text-frost-white"
                      : "bg-white border border-gray-200 text-agro-dark hover:bg-gray-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              const outOfStock = p.totalStock === 0;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={outOfStock}
                  className={cn(
                    "text-left p-3 rounded-[12px] border transition-all active:scale-[0.97]",
                    outOfStock
                      ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                      : inCart
                        ? "bg-primary/5 border-primary/30"
                        : "bg-white border-gray-200 hover:border-primary/30 shadow-card"
                  )}
                >
                  <p className="font-body text-sm font-medium text-agro-dark leading-tight mb-1">{p.name}</p>
                  <p className="font-display font-semibold text-primary text-sm">{formatCurrency(p.sellingPrice)}</p>
                  <p className="font-body text-xs text-muted mt-0.5">
                    {outOfStock ? "Out of stock" : `${p.totalStock} ${p.unit} left`}
                  </p>
                  {inCart && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-body text-primary font-medium">
                      <CheckCircle className="h-3 w-3" /> {inCart.quantity} in cart
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-8 text-center">
              <p className="font-body text-muted">No products found</p>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-display font-semibold text-agro-dark">Cart</h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="font-body text-xs text-muted hover:text-status-cancelled">
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="font-body text-sm text-muted">Tap products to add them</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {cart.map((item) => (
                    <div key={item.product.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-body text-sm font-medium text-agro-dark leading-tight">{item.product.name}</p>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-muted hover:text-status-cancelled shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.product.id, -1)}
                            className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-gray-200 hover:bg-gray-50 text-agro-dark"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-body text-sm font-medium text-agro-dark">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.product.id, 1)}
                            disabled={item.quantity >= item.product.totalStock}
                            className="h-8 w-8 flex items-center justify-center rounded-[6px] border border-gray-200 hover:bg-gray-50 text-agro-dark disabled:opacity-30"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-display font-semibold text-sm text-agro-dark">
                          {formatCurrency(item.product.sellingPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-body text-sm text-muted">Total</span>
                    <span className="font-display font-bold text-xl text-agro-dark">{formatCurrency(cartTotal)}</span>
                  </div>

                  {/* Payment method */}
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.value}
                        onClick={() => setPaymentMethod(pm.value as "CASH" | "TRANSFER" | "POS")}
                        className={cn(
                          "h-10 rounded-[8px] font-body text-sm transition-colors border",
                          paymentMethod === pm.value
                            ? "bg-agro-dark text-frost-white border-transparent"
                            : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>

                  {error && <p className="text-status-cancelled text-sm mb-2">{error}</p>}

                  <button
                    onClick={handleSale}
                    disabled={submitting || cart.length === 0}
                    className="w-full h-12 rounded-[8px] bg-primary text-agro-dark font-display font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Recording…" : `Charge ${formatCurrency(cartTotal)}`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Today's sales summary */}
          {sales.length > 0 && (
            <div className="mt-4 bg-white rounded-[12px] border border-gray-200 shadow-card p-4">
              <h3 className="font-display font-semibold text-sm text-agro-dark mb-3">Today's Sales</h3>
              <div className="space-y-2">
                {sales.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="font-body text-xs text-muted">
                        {new Date(s.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}{s.itemCount} item{s.itemCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="font-display font-semibold text-sm text-agro-dark">{formatCurrency(s.total)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                <span className="font-body text-xs text-muted">{sales.length} sale{sales.length !== 1 ? "s" : ""}</span>
                <span className="font-display font-semibold text-sm text-primary">
                  {formatCurrency(sales.reduce((sum, s) => sum + s.total, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipt modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-agro-dark/40">
          <div className="w-full max-w-xs bg-white rounded-[12px] shadow-xl p-5">
            <div className="text-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-display font-bold text-xl text-agro-dark">Sale Complete!</h2>
              <p className="font-body text-sm text-muted">{formatCurrency(lastSale.total)} · {lastSale.paymentMethod}</p>
            </div>

            <div className="border border-gray-100 rounded-[8px] p-3 mb-4 space-y-1.5">
              {lastSale.items.map((item, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="font-body text-sm text-agro-dark">{item.name} × {item.quantity}</span>
                  <span className="font-body text-sm font-medium text-agro-dark">{formatCurrency(item.total)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-1.5 flex justify-between">
                <span className="font-display font-semibold text-sm text-agro-dark">Total</span>
                <span className="font-display font-bold text-sm text-primary">{formatCurrency(lastSale.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="flex-1 h-11 rounded-[8px] border border-green-200 bg-green-50 text-green-700 font-body text-sm hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="h-4 w-4" />
                Share
              </button>
            </div>
            <button
              onClick={() => setShowReceipt(false)}
              className="w-full h-11 rounded-[8px] bg-primary text-agro-dark font-display font-semibold hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesHistory({ sales }: { sales: SaleRecord[] }) {
  return (
    <div className="space-y-2">
      {sales.map((s) => (
        <div key={s.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-body text-sm font-medium text-agro-dark">
              {s.itemCount} item{s.itemCount !== 1 ? "s" : ""} · {s.paymentMethod}
            </p>
            <p className="font-body text-xs text-muted">
              {new Date(s.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <span className="font-display font-bold text-agro-dark">{formatCurrency(s.total)}</span>
        </div>
      ))}
    </div>
  );
}
