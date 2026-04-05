"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Skeleton, ProductRowSkeleton } from "@/components/shared/skeleton";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Loader2,
  Package,
  User,
  Truck,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Suspense } from "react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  sellingPrice: number;
  category: { id: string; name: string };
};

type CartItem = {
  product: Product;
  quantity: number;
};

type OrderResult = {
  orderCode: string;
  total: number;
  paymentUrl: string | null;
};

export default function OrderPage() {
  return (
    <Suspense>
      <OrderFlow />
    </Suspense>
  );
}

function OrderFlow() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("product");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/products")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
          // Auto-add preselected product
          if (preselectedProductId) {
            const found = data.data.find((p: Product) => p.id === preselectedProductId);
            if (found) {
              setCart([{ product: found, quantity: 1 }]);
            }
          }
        }
      })
      .finally(() => setLoading(false));
  }, [preselectedProductId]);

  const categories = Array.from(new Set(products.map((p) => p.category.name))).sort();

  const filtered = products.filter((p) => {
    if (categoryFilter && p.category.name !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }, []);

  const subtotal = cart.reduce((s, c) => s + c.product.sellingPrice * c.quantity, 0);

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          deliveryMethod,
          deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress.trim() : undefined,
          notes: notes.trim() || undefined,
          items: cart.map((c) => ({
            productId: c.product.id,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.paymentUrl) {
          // Redirect to Valuepay checkout
          window.location.href = data.data.paymentUrl;
        } else {
          // Fallback: Valuepay unavailable, show order confirmation
          setOrderResult(data.data);
          setStep(4);
        }
      } else {
        setError(data.error || "Failed to place order");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step indicators
  const steps = [
    { num: 1, label: "Products", icon: ShoppingCart },
    { num: 2, label: "Details", icon: User },
    { num: 3, label: "Review", icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/products" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-agro-dark">Place an Order</h1>
        <p className="text-muted-dark text-sm mt-1">Select products, fill in your details, and we&apos;ll get it ready for you.</p>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 sm:w-12 ${step >= s.num ? "bg-primary" : "bg-gray-200"}`} />}
              <button
                onClick={() => {
                  if (s.num === 1) setStep(1);
                  else if (s.num === 2 && cart.length > 0) setStep(2);
                  else if (s.num === 3 && cart.length > 0 && customerName && customerPhone) setStep(3);
                }}
                className={`flex items-center gap-2 px-3 h-9 rounded-full text-xs font-medium transition-colors ${
                  step >= s.num
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-muted"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 1: Select Products ── */}
      {step === 1 && (
        <div>
          {/* Search & filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full h-11 pl-10 pr-4 rounded-[8px] bg-white border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 px-4 rounded-[8px] bg-white border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted">No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id);
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-4 rounded-[12px] border transition-colors ${
                      inCart ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="h-16 w-16 flex-shrink-0 rounded-[8px] placeholder-branded flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <Image src={product.imageUrl} alt={product.name} width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-agro-dark text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted">{product.category.name} &middot; per {product.unit.toLowerCase()}</p>
                      <p className="font-display font-bold text-accent text-sm mt-1">{formatCurrency(product.sellingPrice)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="h-9 w-9 rounded-[8px] border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-display font-semibold text-agro-dark">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="h-9 w-9 rounded-[8px] bg-primary text-white flex items-center justify-center hover:bg-primary-dark"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="h-11 px-4 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cart summary bar */}
          {cart.length > 0 && (
            <div className="sticky bottom-4 mt-6 p-4 rounded-[12px] bg-agro-dark text-white shadow-lg flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {cart.reduce((s, c) => s + c.quantity, 0)} item{cart.reduce((s, c) => s + c.quantity, 0) !== 1 ? "s" : ""} in cart
                </p>
                <p className="font-display font-bold text-lg">{formatCurrency(subtotal)}</p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="btn-press h-12 px-6 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Customer Details ── */}
      {step === 2 && (
        <div className="max-w-lg">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
            <h2 className="font-display font-bold text-lg text-agro-dark mb-5">Your Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-agro-dark mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-agro-dark mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="080XXXXXXXX"
                  className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-agro-dark mb-1.5">Email (optional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-agro-dark mb-2">Delivery Method *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("PICKUP")}
                    className={`h-14 rounded-[8px] border-2 flex flex-col items-center justify-center gap-1 text-sm font-medium transition-colors ${
                      deliveryMethod === "PICKUP"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-muted hover:border-gray-300"
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("DELIVERY")}
                    className={`h-14 rounded-[8px] border-2 flex flex-col items-center justify-center gap-1 text-sm font-medium transition-colors ${
                      deliveryMethod === "DELIVERY"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-muted hover:border-gray-300"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Delivery
                  </button>
                </div>
              </div>

              {deliveryMethod === "DELIVERY" && (
                <div>
                  <label className="block text-xs font-medium text-agro-dark mb-1.5">Delivery Address *</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={2}
                    placeholder="Full delivery address"
                    className="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-agro-dark mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special instructions"
                  className="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="h-12 px-6 rounded-[8px] border border-gray-200 text-agro-dark font-display font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => {
                if (!customerName.trim() || !customerPhone.trim()) return;
                if (deliveryMethod === "DELIVERY" && !deliveryAddress.trim()) return;
                setStep(3);
              }}
              disabled={!customerName.trim() || !customerPhone.trim() || (deliveryMethod === "DELIVERY" && !deliveryAddress.trim())}
              className="btn-press flex-1 h-12 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Review Order <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Submit ── */}
      {step === 3 && (
        <div className="max-w-lg">
          {/* Cart items */}
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
            <h2 className="font-display font-bold text-lg text-agro-dark mb-4">Order Summary</h2>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 flex-shrink-0 rounded-[8px] placeholder-branded flex items-center justify-center overflow-hidden">
                    {item.product.imageUrl ? (
                      <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-agro-dark truncate">{item.product.name}</p>
                    <p className="text-xs text-muted">
                      {item.quantity} x {formatCurrency(item.product.sellingPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-sm text-agro-dark">
                      {formatCurrency(item.product.sellingPrice * item.quantity)}
                    </p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-agro-dark font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {deliveryMethod === "DELIVERY" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Delivery Fee</span>
                  <span className="text-agro-dark font-medium">Calculated after confirmation</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer details summary */}
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
            <h3 className="font-display font-semibold text-sm text-agro-dark mb-3">Your Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Name</span>
                <span className="text-agro-dark font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Phone</span>
                <span className="text-agro-dark font-medium">{customerPhone}</span>
              </div>
              {customerEmail && (
                <div className="flex justify-between">
                  <span className="text-muted">Email</span>
                  <span className="text-agro-dark font-medium">{customerEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className="text-agro-dark font-medium">
                  {deliveryMethod === "PICKUP" ? "Pickup from store" : "Delivery"}
                </span>
              </div>
              {deliveryMethod === "DELIVERY" && deliveryAddress && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted flex-shrink-0">Address</span>
                  <span className="text-agro-dark font-medium text-right">{deliveryAddress}</span>
                </div>
              )}
              {notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted flex-shrink-0">Notes</span>
                  <span className="text-agro-dark text-right">{notes}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="h-12 px-6 rounded-[8px] border border-gray-200 text-agro-dark font-display font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-press flex-1 h-12 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Place Order & Pay
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirmation ── */}
      {step === 4 && orderResult && (
        <div className="max-w-sm mx-auto text-center">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-8 mb-6">
            <div className="h-20 w-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display font-bold text-2xl text-agro-dark mb-2">Order Placed!</h2>
            <p className="text-sm text-muted-dark mb-6">
              Your order has been submitted. We&apos;ll contact you shortly to confirm.
            </p>

            <div className="bg-gray-50 rounded-[8px] p-4 mb-5">
              <p className="text-xs text-muted mb-1">Your Order Code</p>
              <p className="font-display font-bold text-3xl text-primary tracking-widest">
                {orderResult.orderCode}
              </p>
            </div>

            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted">Total</span>
              <span className="font-display font-bold text-accent">{formatCurrency(orderResult.total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/track-order"
              className="btn-press flex items-center justify-center w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              Track Your Order
            </Link>
            <Link
              href="/products"
              className="flex items-center justify-center w-full h-12 rounded-[8px] border border-gray-200 text-agro-dark text-sm hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
