"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, Send, Upload, X, ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const UNIT_OPTIONS = ["KG", "BAG", "SACK", "TONNE", "PIECE", "CARTON", "LITRE", "BUNCH"];

export default function NewOfferPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    productName: "",
    quantity: "",
    unit: "KG",
    offeredPrice: "",
    notes: "",
  });
  const [productImages, setProductImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/public/aggregator/auth/me")
      .then((r) => {
        if (!r.ok) { router.push("/aggregator/login"); return; }
        return r.json();
      })
      .then((data) => {
        if (data?.success) setAuthenticated(true);
        else router.push("/aggregator/login");
      })
      .catch(() => router.push("/aggregator/login"));
  }, [router]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.offeredPrice) || 0;
  const totalValue = qty * price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.productName.trim() || !qty || !price) {
      setError("Product name, quantity, and price are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/aggregator/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: form.productName.trim(),
          quantity: qty,
          unit: form.unit,
          offeredPrice: price,
          notes: form.notes.trim() || undefined,
          productImages,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to submit offer");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-[12px] border border-gray-200 shadow-card p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display font-bold text-xl text-agro-dark mb-2">Offer Submitted!</h2>
          <p className="text-sm text-muted-dark mb-6">
            Your offer to supply <strong>{form.productName}</strong> has been sent. Our team will review it and respond shortly.
          </p>
          <div className="space-y-3">
            <Link
              href="/aggregator/portal"
              className="flex items-center justify-center w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setForm({ productName: "", quantity: "", unit: "KG", offeredPrice: "", notes: "" });
                setProductImages([]);
              }}
              className="flex items-center justify-center w-full h-12 rounded-[8px] border border-gray-200 text-agro-dark text-sm hover:bg-gray-50 transition-colors"
            >
              Submit Another Offer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/aggregator/portal" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <h1 className="font-display text-2xl font-bold text-agro-dark mb-1">Submit an Offer</h1>
      <p className="text-muted-dark text-sm mb-8">Propose to supply an agricultural product to Nakowa</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-agro-dark mb-1.5">Product Name *</label>
          <input
            type="text"
            value={form.productName}
            onChange={(e) => set("productName", e.target.value)}
            placeholder="e.g. Beans (Honey), Maize, Rice (Ofada)"
            className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
          />
          <p className="text-[11px] text-muted mt-1">The type/variety of product you want to supply</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Quantity *</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="e.g. 500"
              min="0"
              step="any"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Unit *</label>
            <select
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-agro-dark mb-1.5">Your Price (per {form.unit}) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">NGN</span>
            <input
              type="number"
              value={form.offeredPrice}
              onChange={(e) => set("offeredPrice", e.target.value)}
              placeholder="0.00"
              min="0"
              step="any"
              className="w-full h-12 pl-14 pr-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Total preview */}
        {qty > 0 && price > 0 && (
          <div className="p-4 rounded-[8px] bg-gray-50 border border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total Value</span>
              <span className="font-display font-bold text-accent">{formatCurrency(totalValue)}</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {qty} {form.unit} x {formatCurrency(price)} per {form.unit}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-agro-dark mb-1.5">Additional Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Quality details, delivery timeline, storage conditions, etc."
            className="w-full px-4 py-3 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Product Images */}
        <div>
          <label className="block text-xs font-medium text-agro-dark mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-muted" /> Product Images (optional)
          </label>
          <p className="text-[11px] text-muted mb-2">Upload up to 5 photos to help the team evaluate your product</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {productImages.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt={`Product ${i + 1}`} className="h-20 w-20 rounded-[8px] object-cover border border-gray-200" />
                <button type="button" onClick={() => setProductImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {productImages.length < 5 && (
            <label className={`inline-flex items-center gap-2 h-11 px-4 rounded-[8px] border border-dashed border-gray-300 text-muted-dark text-sm cursor-pointer hover:bg-gray-50 transition-colors ${imageUploading ? "opacity-50 pointer-events-none" : ""}`}>
              {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {imageUploading ? "Uploading..." : "Add Photo"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageUploading(true);
                try {
                  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
                  if (!cloudName || !uploadPreset) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("upload_preset", uploadPreset);
                  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.secure_url) setProductImages((imgs) => [...imgs, data.secure_url]);
                } catch { /* ignore */ } finally {
                  setImageUploading(false);
                  e.target.value = "";
                }
              }} />
            </label>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Offer
            </>
          )}
        </button>
      </form>
    </div>
  );
}
