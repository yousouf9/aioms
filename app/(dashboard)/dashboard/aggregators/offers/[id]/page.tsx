"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Clock,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  FileSignature,
  PackageCheck,
  CircleCheckBig,
  CircleDollarSign,
  Truck,
  Banknote,
  Send,
  X,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldX,
  Upload,
  FileUp,
  FileCheck,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { CloudinaryUpload } from "@/components/dashboard/cloudinary-upload";

type Delivery = {
  id: string;
  quantityDelivered: number;
  unit: string;
  deliveryDate: string;
  notes: string | null;
  receivedBy: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  profileImageUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
};

type Negotiation = {
  id: string;
  round: number;
  by: string;
  action: string;
  price: number;
  quantity: number;
  unit: string;
  note: string | null;
  createdAt: string;
};

type OfferDetail = {
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
  productImages: string[];
  agreementDocUrl: string | null;
  signedAgreementDocUrl: string | null;
  agreementRejectionReason: string | null;
  agreementSentAt: string | null;
  agreementSignedAt: string | null;
  suppliedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  deliveries: Delivery[];
  negotiations: Negotiation[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending Review", color: "text-yellow-700", bg: "bg-yellow-100", icon: Clock },
  COUNTERED: { label: "Countered", color: "text-blue-700", bg: "bg-blue-100", icon: ArrowRightLeft },
  ACCEPTED: { label: "Accepted", color: "text-green-700", bg: "bg-green-100", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "text-red-700", bg: "bg-red-100", icon: XCircle },
  AGREEMENT_SENT: { label: "Agreement Sent", color: "text-indigo-700", bg: "bg-indigo-100", icon: FileUp },
  AGREEMENT_UPLOADED: { label: "Awaiting Review", color: "text-orange-700", bg: "bg-orange-100", icon: FileCheck },
  AGREEMENT_SIGNED: { label: "Agreement Signed", color: "text-purple-700", bg: "bg-purple-100", icon: FileSignature },
  SUPPLIED: { label: "Goods Supplied", color: "text-teal-700", bg: "bg-teal-100", icon: PackageCheck },
  COMPLETED: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-100", icon: CircleCheckBig },
};

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Forms
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterQty, setCounterQty] = useState("");

  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [showDelivery, setShowDelivery] = useState(false);
  const [deliveryQty, setDeliveryQty] = useState("");
  const [deliveryUnit, setDeliveryUnit] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [showUploadAgreement, setShowUploadAgreement] = useState(false);
  const [agreementDocUrl, setAgreementDocUrl] = useState("");

  const [showRejectAgreement, setShowRejectAgreement] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadOffer = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/aggregators/offers/${id}`);
      const data = await res.json();
      if (data.success) setOffer(data.data);
      else setError(data.error || "Failed to load offer");
    } catch {
      setError("Failed to load offer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOffer(); }, [loadOffer]);

  const closeForms = () => {
    setShowCounter(false); setCounterPrice(""); setCounterQty("");
    setShowAdvance(false); setAdvanceAmount("");
    setShowPayment(false); setPaymentAmount("");
    setShowDelivery(false); setDeliveryQty(""); setDeliveryUnit(""); setDeliveryNotes("");
    setShowUploadAgreement(false); setAgreementDocUrl("");
    setShowRejectAgreement(false); setRejectionReason("");
  };

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/aggregators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: id, action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        closeForms();
        await loadOffer();
      } else {
        setError(data.error || "Action failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  if (!offer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-3">Offer not found</p>
        <Link href="/dashboard/aggregators" className="text-primary text-sm hover:underline">Back to aggregators</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const finalQty = offer.agreedQuantity ?? offer.quantity;
  const deliveryPct = finalQty > 0 ? Math.min(100, (offer.totalDelivered / finalQty) * 100) : 0;
  const paymentPct = offer.dealValue > 0 ? Math.min(100, (offer.totalPaid / offer.dealValue) * 100) : 0;
  const outstanding = Math.max(0, offer.dealValue - offer.totalPaid);

  return (
    <div>
      {/* Header */}
      <Link href="/dashboard/aggregators" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-5">
        <ArrowLeft className="h-4 w-4" /> Back to Aggregators
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-agro-dark">{offer.productName}</h1>
          <p className="text-sm text-muted mt-0.5">Offer from {offer.customer.name} &middot; {formatDate(new Date(offer.createdAt))}</p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="h-4 w-4" />
          {cfg.label}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-sm mb-4 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — Offer details + actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price negotiation card */}
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
            <h2 className="font-display font-semibold text-agro-dark mb-4">Pricing & Quantity</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-[8px] bg-gray-50">
                <p className="text-[10px] text-muted uppercase">Offered</p>
                <p className="font-display font-bold text-lg text-agro-dark">{formatCurrency(offer.offeredPrice)}</p>
                <p className="text-xs text-muted">{offer.quantity} {offer.unit}</p>
                <p className="text-xs text-muted-dark font-medium mt-1">Total: {formatCurrency(offer.offeredPrice * offer.quantity)}</p>
              </div>
              {offer.counterPrice !== null && (
                <div className="p-3 rounded-[8px] bg-blue-50">
                  <p className="text-[10px] text-blue-600 uppercase">Counter</p>
                  <p className="font-display font-bold text-lg text-blue-700">{formatCurrency(offer.counterPrice)}</p>
                  <p className="text-xs text-blue-500">{offer.counterQuantity ?? offer.quantity} {offer.unit}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Total: {formatCurrency(offer.counterPrice * (offer.counterQuantity ?? offer.quantity))}</p>
                </div>
              )}
              {offer.agreedPrice !== null && (
                <div className="p-3 rounded-[8px] bg-green-50">
                  <p className="text-[10px] text-green-600 uppercase">Agreed</p>
                  <p className="font-display font-bold text-lg text-green-700">{formatCurrency(offer.agreedPrice)}</p>
                  <p className="text-xs text-green-500">{offer.agreedQuantity ?? offer.quantity} {offer.unit}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">Total: {formatCurrency(offer.agreedPrice * (offer.agreedQuantity ?? offer.quantity))}</p>
                </div>
              )}
            </div>

            {offer.dealValue > 0 && ["ACCEPTED", "AGREEMENT_SIGNED", "SUPPLIED", "COMPLETED"].includes(offer.status) && (
              <div className="mt-3 p-3 rounded-[8px] bg-amber-50 flex items-center justify-between">
                <span className="text-sm text-amber-700">Total Deal Value</span>
                <span className="font-display font-bold text-amber-700">{formatCurrency(offer.dealValue)}</span>
              </div>
            )}
          </div>

          {/* Product images */}
          {offer.productImages && offer.productImages.length > 0 && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h2 className="font-display font-semibold text-agro-dark mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted" /> Product Images
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {offer.productImages.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <img src={img} alt={`Product ${i + 1}`} className="h-24 w-24 rounded-[8px] object-cover border border-gray-200 hover:border-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Agreement documents */}
          {(offer.agreementDocUrl || offer.signedAgreementDocUrl) && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h2 className="font-display font-semibold text-agro-dark mb-3">Agreement Documents</h2>
              <div className="space-y-3">
                {offer.agreementDocUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-[8px] bg-indigo-50">
                    <FileUp className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-indigo-700">Agreement Document (Admin)</p>
                      <p className="text-xs text-indigo-500">Sent to aggregator for signing</p>
                    </div>
                    <a href={offer.agreementDocUrl} target="_blank" rel="noopener noreferrer" download={offer.agreementDocUrl.includes("/raw/")}
                      className="h-9 px-3 rounded-[6px] bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                      {offer.agreementDocUrl.includes("/raw/") ? "Download" : "View"}
                    </a>
                  </div>
                )}
                {offer.signedAgreementDocUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-[8px] bg-purple-50">
                    <FileCheck className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-700">Signed Agreement (Aggregator)</p>
                      <p className="text-xs text-purple-500">Uploaded by aggregator</p>
                    </div>
                    <a href={offer.signedAgreementDocUrl} target="_blank" rel="noopener noreferrer" download={offer.signedAgreementDocUrl.includes("/raw/")}
                      className="h-9 px-3 rounded-[6px] bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors flex items-center gap-1.5">
                      {offer.signedAgreementDocUrl.includes("/raw/") ? "Download" : "View"}
                    </a>
                  </div>
                )}
                {offer.agreementRejectionReason && (
                  <div className="flex items-start gap-3 p-3 rounded-[8px] bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Last Rejection Reason</p>
                      <p className="text-sm text-red-600 mt-0.5">{offer.agreementRejectionReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions card */}
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
            <h2 className="font-display font-semibold text-agro-dark mb-4">Actions</h2>

            <div className="flex flex-wrap gap-2">
              {/* PENDING */}
              {offer.status === "PENDING" && (
                <>
                  <button onClick={() => { closeForms(); setShowCounter(true); setCounterQty(String(offer.quantity)); }}
                    disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" /> Counter Offer
                  </button>
                  <button onClick={() => handleAction("ACCEPT")} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Accept Offer
                  </button>
                  <button onClick={() => handleAction("REJECT")} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </>
              )}

              {/* COUNTERED */}
              {offer.status === "COUNTERED" && (
                <p className="text-sm text-blue-600 italic flex items-center gap-2 py-2">
                  <Clock className="h-4 w-4" /> Waiting for aggregator to respond to your counter offer
                </p>
              )}

              {/* ACCEPTED — upload agreement document */}
              {offer.status === "ACCEPTED" && (
                <button onClick={() => { closeForms(); setShowUploadAgreement(true); }} disabled={actionLoading}
                  className="h-11 px-4 rounded-[8px] bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload Agreement Document
                </button>
              )}

              {/* AGREEMENT_SENT — waiting for aggregator */}
              {offer.status === "AGREEMENT_SENT" && (
                <p className="text-sm text-indigo-600 italic flex items-center gap-2 py-2">
                  <FileUp className="h-4 w-4" /> Agreement sent — waiting for aggregator to sign and upload
                </p>
              )}

              {/* AGREEMENT_UPLOADED — review signed doc */}
              {offer.status === "AGREEMENT_UPLOADED" && (
                <>
                  <button onClick={() => handleAction("APPROVE_AGREEMENT")} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve Agreement
                  </button>
                  <button onClick={() => { closeForms(); setShowRejectAgreement(true); }} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Reject Agreement
                  </button>
                </>
              )}

              {/* AGREEMENT_SIGNED */}
              {offer.status === "AGREEMENT_SIGNED" && (
                <>
                  <button onClick={() => { closeForms(); setShowDelivery(true); setDeliveryUnit(offer.unit); }}
                    disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Record Delivery
                  </button>
                  <button onClick={() => { closeForms(); setShowAdvance(true); }} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Record Advance
                  </button>
                  <button onClick={() => handleAction("MARK_SUPPLIED")} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Mark Supplied
                  </button>
                </>
              )}

              {/* SUPPLIED */}
              {offer.status === "SUPPLIED" && (
                <>
                  <button onClick={() => { closeForms(); setShowPayment(true); }} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4" /> Record Payment
                  </button>
                  <button onClick={() => { closeForms(); setShowAdvance(true); }} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] border border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Record Advance
                  </button>
                  <button onClick={() => handleAction("MARK_COMPLETED")} disabled={actionLoading}
                    className="h-11 px-4 rounded-[8px] bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheckBig className="h-4 w-4" />} Mark Completed
                  </button>
                </>
              )}

              {/* COMPLETED */}
              {offer.status === "COMPLETED" && (
                <p className="text-sm text-emerald-600 font-medium flex items-center gap-2 py-2">
                  <CircleCheckBig className="h-4 w-4" /> Deal completed{offer.completedAt && ` on ${formatDate(new Date(offer.completedAt))}`}
                </p>
              )}

              {/* REJECTED */}
              {offer.status === "REJECTED" && (
                <p className="text-sm text-red-500 italic py-2">This offer was rejected.</p>
              )}
            </div>

            {/* Counter form */}
            {showCounter && (
              <div className="mt-4 p-4 rounded-[8px] bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-3">Set Counter Offer</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-blue-700 mb-1">Price (per {offer.unit})</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">NGN</span>
                      <input type="number" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)}
                        placeholder="0.00" min="0" step="any"
                        className="w-full h-11 pl-12 pr-3 rounded-[8px] border border-blue-200 text-agro-dark text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-700 mb-1">Quantity ({offer.unit})</label>
                    <input type="number" value={counterQty} onChange={(e) => setCounterQty(e.target.value)}
                      placeholder="0" min="0" step="any"
                      className="w-full h-11 px-3 rounded-[8px] border border-blue-200 text-agro-dark text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const p = parseFloat(counterPrice); const q = parseFloat(counterQty);
                    if (!p && !q) return;
                    handleAction("COUNTER", { counterPrice: p || undefined, counterQuantity: q || undefined });
                  }} disabled={actionLoading || (!counterPrice && !counterQty)}
                    className="h-11 px-5 rounded-[8px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                  </button>
                  <button onClick={closeForms} className="h-11 px-3 rounded-[8px] border border-blue-200 text-blue-600 hover:bg-blue-100">Cancel</button>
                </div>
              </div>
            )}

            {/* Advance form */}
            {showAdvance && (
              <div className="mt-4 p-4 rounded-[8px] bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">Record Advance Payment</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">NGN</span>
                    <input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0.00" min="0" step="any"
                      className="w-full h-11 pl-12 pr-4 rounded-[8px] border border-amber-200 text-agro-dark text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <button onClick={() => { if (!advanceAmount || parseFloat(advanceAmount) <= 0) return; handleAction("ADVANCE", { advanceAmount: parseFloat(advanceAmount) }); }}
                    disabled={actionLoading || !advanceAmount}
                    className="h-11 px-5 rounded-[8px] bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} Record
                  </button>
                  <button onClick={closeForms} className="h-11 px-3 rounded-[8px] border border-amber-200 text-amber-600 hover:bg-amber-100">Cancel</button>
                </div>
              </div>
            )}

            {/* Payment form */}
            {showPayment && (
              <div className="mt-4 p-4 rounded-[8px] bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800 mb-1">Record Payment</p>
                <p className="text-xs text-emerald-600 mb-3">Outstanding: {formatCurrency(outstanding)}</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">NGN</span>
                    <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00" min="0" step="any"
                      className="w-full h-11 pl-12 pr-4 rounded-[8px] border border-emerald-200 text-agro-dark text-sm focus:outline-none focus:border-emerald-400" />
                  </div>
                  <button onClick={() => { if (!paymentAmount || parseFloat(paymentAmount) <= 0) return; handleAction("RECORD_PAYMENT", { paymentAmount: parseFloat(paymentAmount) }); }}
                    disabled={actionLoading || !paymentAmount}
                    className="h-11 px-5 rounded-[8px] bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />} Record
                  </button>
                  <button onClick={closeForms} className="h-11 px-3 rounded-[8px] border border-emerald-200 text-emerald-600 hover:bg-emerald-100">Cancel</button>
                </div>
              </div>
            )}

            {/* Delivery form */}
            {showDelivery && (
              <div className="mt-4 p-4 rounded-[8px] bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-3">Record Delivery</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-green-700 mb-1">Quantity</label>
                    <input type="number" value={deliveryQty} onChange={(e) => setDeliveryQty(e.target.value)}
                      placeholder="0" min="0" step="any"
                      className="w-full h-11 px-3 rounded-[8px] border border-green-200 text-agro-dark text-sm focus:outline-none focus:border-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-green-700 mb-1">Unit</label>
                    <input type="text" value={deliveryUnit} onChange={(e) => setDeliveryUnit(e.target.value)}
                      className="w-full h-11 px-3 rounded-[8px] border border-green-200 text-agro-dark text-sm focus:outline-none focus:border-green-400" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-green-700 mb-1">Notes (optional)</label>
                  <input type="text" value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Quality, batch, etc."
                    className="w-full h-11 px-3 rounded-[8px] border border-green-200 text-agro-dark text-sm focus:outline-none focus:border-green-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (!deliveryQty || parseFloat(deliveryQty) <= 0 || !deliveryUnit.trim()) return;
                    handleAction("DELIVERY", { delivery: { quantityDelivered: parseFloat(deliveryQty), unit: deliveryUnit.trim(), notes: deliveryNotes.trim() || undefined } });
                  }} disabled={actionLoading || !deliveryQty || !deliveryUnit.trim()}
                    className="h-11 px-5 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Record
                  </button>
                  <button onClick={closeForms} className="h-11 px-3 rounded-[8px] border border-green-200 text-green-600 hover:bg-green-100">Cancel</button>
                </div>
              </div>
            )}

            {/* Upload agreement form */}
            {showUploadAgreement && (
              <div className="mt-4 p-4 rounded-[8px] bg-indigo-50 border border-indigo-200">
                <p className="text-sm font-medium text-indigo-800 mb-1">Upload Agreement Document</p>
                <p className="text-xs text-indigo-600 mb-3">Upload the prepared agreement for the aggregator to review and sign.</p>
                <div className="mb-3">
                  <CloudinaryUpload
                    value={agreementDocUrl}
                    onUploaded={(url) => setAgreementDocUrl(url)}
                    onChange={(url) => setAgreementDocUrl(url)}
                    label="Agreement Document (PDF or Image)"
                    accept="image/*,.pdf"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (!agreementDocUrl) return;
                    handleAction("SEND_AGREEMENT", { agreementDocUrl });
                  }} disabled={actionLoading || !agreementDocUrl}
                    className="h-11 px-5 rounded-[8px] bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send to Aggregator
                  </button>
                  <button onClick={closeForms} className="h-11 px-3 rounded-[8px] border border-indigo-200 text-indigo-600 hover:bg-indigo-100">Cancel</button>
                </div>
              </div>
            )}

            {/* Reject agreement form */}
            {showRejectAgreement && (
              <div className="mt-4 p-4 rounded-[8px] bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-1">Reject Signed Agreement</p>
                <p className="text-xs text-red-600 mb-3">Explain what needs to be corrected so the aggregator can re-upload.</p>
                <div className="mb-3">
                  <label className="block text-xs text-red-700 mb-1">Rejection Reason *</label>
                  <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Signature is missing on page 2, wrong date entered..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-[8px] border border-red-200 text-agro-dark text-sm focus:outline-none focus:border-red-400 resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (!rejectionReason.trim()) return;
                    handleAction("REJECT_AGREEMENT", { rejectionReason: rejectionReason.trim() });
                  }} disabled={actionLoading || !rejectionReason.trim()}
                    className="h-11 px-5 rounded-[8px] bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject & Send Back
                  </button>
                  <button onClick={closeForms} className="h-11 px-3 rounded-[8px] border border-red-200 text-red-600 hover:bg-red-100">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Supply & Payment progress */}
          {["AGREEMENT_SENT", "AGREEMENT_UPLOADED", "AGREEMENT_SIGNED", "SUPPLIED", "COMPLETED"].includes(offer.status) && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h2 className="font-display font-semibold text-agro-dark mb-4">Progress</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-purple-700 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" /> Supply
                    </span>
                    <span className="text-xs text-purple-500">{Math.round(deliveryPct)}%</span>
                  </div>
                  <div className="h-2.5 bg-purple-100 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${deliveryPct}%` }} />
                  </div>
                  <p className="text-xs text-purple-600">{offer.totalDelivered} / {finalQty} {offer.unit}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                      <span className="font-bold text-[10px]">₦</span> Payment
                    </span>
                    <span className="text-xs text-amber-500">{Math.round(paymentPct)}%</span>
                  </div>
                  <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${paymentPct}%` }} />
                  </div>
                  <p className="text-xs text-amber-600">{formatCurrency(offer.totalPaid)} / {formatCurrency(offer.dealValue)}</p>
                </div>
              </div>
              {offer.advancePaid > 0 && (
                <p className="text-xs text-muted mt-3 pt-3 border-t border-gray-100">
                  Advance paid: {formatCurrency(offer.advancePaid)} &middot; Outstanding: {formatCurrency(outstanding)}
                </p>
              )}
            </div>
          )}

          {/* Deliveries table */}
          {offer.deliveries.length > 0 && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h2 className="font-display font-semibold text-agro-dark mb-4">Deliveries ({offer.deliveries.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-dark">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-dark">Quantity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-dark">Received By</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-dark">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.deliveries.map((d) => (
                      <tr key={d.id} className="border-b border-gray-50">
                        <td className="px-3 py-2 text-muted-dark">
                          {new Date(d.deliveryDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-3 py-2 font-medium text-agro-dark">{d.quantityDelivered} {d.unit}</td>
                        <td className="px-3 py-2 text-muted-dark">{d.receivedBy}</td>
                        <td className="px-3 py-2 text-muted">{d.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Negotiation history */}
          {offer.negotiations && offer.negotiations.length > 0 && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h2 className="font-display font-semibold text-agro-dark mb-4">Negotiation History</h2>
              <div className="space-y-3">
                {offer.negotiations.map((n) => {
                  const isAdmin = n.by === "ADMIN";
                  const actionLabels: Record<string, string> = {
                    INITIAL: "Submitted offer",
                    COUNTER: isAdmin ? "Admin countered" : "Aggregator countered",
                    ACCEPT: isAdmin ? "Admin accepted" : "Aggregator accepted",
                    REJECT: isAdmin ? "Admin rejected" : "Aggregator rejected",
                    WITHDRAW: "Aggregator withdrew",
                  };
                  const label = actionLabels[n.action] || n.action;
                  return (
                    <div key={n.id} className={`flex gap-3 p-3 rounded-[8px] ${isAdmin ? "bg-blue-50" : "bg-gray-50"}`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isAdmin ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-700"}`}>
                        {n.round}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-agro-dark">{label}</p>
                          <p className="text-[10px] text-muted">{new Date(n.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-dark">
                          <span>Price: {formatCurrency(n.price)} / {n.unit}</span>
                          <span>Qty: {n.quantity} {n.unit}</span>
                          <span className="font-medium">Total: {formatCurrency(n.price * n.quantity)}</span>
                        </div>
                        {n.note && <p className="text-xs text-muted mt-1">{n.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {offer.notes && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h2 className="font-display font-semibold text-agro-dark mb-2">Notes</h2>
              <p className="text-sm text-muted-dark">{offer.notes}</p>
            </div>
          )}
        </div>

        {/* Right column — Aggregator info */}
        <div className="space-y-4">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
            <h2 className="font-display font-semibold text-agro-dark mb-4">Aggregator</h2>
            <div className="flex items-center gap-3 mb-4">
              {offer.customer.profileImageUrl ? (
                <img src={offer.customer.profileImageUrl} alt={offer.customer.name}
                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-display font-bold text-primary text-lg">{offer.customer.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className="font-display font-semibold text-agro-dark">{offer.customer.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {offer.customer.isEmailVerified ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <ShieldX className="h-3 w-3" /> Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-dark">
                <Phone className="h-4 w-4 text-muted" /> {offer.customer.phone}
              </div>
              {offer.customer.email && (
                <div className="flex items-center gap-2 text-muted-dark">
                  <Mail className="h-4 w-4 text-muted" /> {offer.customer.email}
                </div>
              )}
              {offer.customer.address && (
                <div className="flex items-center gap-2 text-muted-dark">
                  <MapPin className="h-4 w-4 text-muted" /> {offer.customer.address}
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link href={`/dashboard/aggregators/${offer.customer.id}`}
                className="text-primary text-sm font-medium hover:underline">
                View all offers from this aggregator
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
            <h2 className="font-display font-semibold text-agro-dark mb-4">Timeline</h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-muted-dark">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                Submitted {formatDate(new Date(offer.createdAt))}
              </div>
              {offer.agreementSentAt && (
                <div className="flex items-center gap-2 text-muted-dark">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  Agreement sent {formatDate(new Date(offer.agreementSentAt))}
                </div>
              )}
              {offer.agreementSignedAt && (
                <div className="flex items-center gap-2 text-muted-dark">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  Agreement approved {formatDate(new Date(offer.agreementSignedAt))}
                </div>
              )}
              {offer.suppliedAt && (
                <div className="flex items-center gap-2 text-muted-dark">
                  <div className="h-2 w-2 rounded-full bg-teal-400" />
                  Goods supplied {formatDate(new Date(offer.suppliedAt))}
                </div>
              )}
              {offer.completedAt && (
                <div className="flex items-center gap-2 text-muted-dark">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  Completed {formatDate(new Date(offer.completedAt))}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted">
                <div className="h-2 w-2 rounded-full bg-gray-300" />
                Last updated {formatDate(new Date(offer.updatedAt))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
