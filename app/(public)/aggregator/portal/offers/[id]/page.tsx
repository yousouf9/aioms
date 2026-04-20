"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Truck,
  Banknote,
  CheckCircle,
  XCircle,
  FileSignature,
  Package,
  Clock,
  ArrowRightLeft,
  PackageCheck,
  CircleCheckBig,
  CircleDollarSign,
  FileUp,
  FileCheck,
  Upload,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CloudinaryUpload } from "@/components/dashboard/cloudinary-upload";

type Delivery = {
  id: string;
  quantityDelivered: number;
  unit: string;
  deliveryDate: string;
  notes: string | null;
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
  totalDelivered: number;
  deliveries: Delivery[];
  negotiations: Negotiation[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  COUNTERED: { label: "Counter Offer", color: "bg-blue-100 text-blue-700", icon: ArrowRightLeft },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  AGREEMENT_SENT: { label: "Sign Agreement", color: "bg-indigo-100 text-indigo-700", icon: FileUp },
  AGREEMENT_UPLOADED: { label: "Under Review", color: "bg-orange-100 text-orange-700", icon: FileCheck },
  AGREEMENT_SIGNED: { label: "Agreement Signed", color: "bg-purple-100 text-purple-700", icon: FileSignature },
  SUPPLIED: { label: "Goods Supplied", color: "bg-teal-100 text-teal-700", icon: PackageCheck },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CircleCheckBig },
};

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = params.id as string;
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCounterBack, setShowCounterBack] = useState(false);
  const [counterBackPrice, setCounterBackPrice] = useState("");
  const [counterBackQty, setCounterBackQty] = useState("");
  const [showUploadSigned, setShowUploadSigned] = useState(false);
  const [signedDocUrl, setSignedDocUrl] = useState("");

  const loadOffer = () => {
    fetch(`/api/public/aggregator/offers/${offerId}`)
      .then((r) => {
        if (!r.ok) { router.push("/aggregator/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.success) setOffer(data.data);
        else router.push("/aggregator/portal");
      })
      .catch(() => router.push("/aggregator/portal"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOffer(); }, [offerId, router]);

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/public/aggregator/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCounterBack(false);
        setCounterBackPrice("");
        setCounterBackQty("");
        setShowUploadSigned(false);
        setSignedDocUrl("");
        loadOffer();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!offer) return null;

  const cfg = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const finalQty = offer.agreedQuantity ?? offer.quantity;
  const deliveryProgress = finalQty > 0 ? (offer.totalDelivered / finalQty) * 100 : 0;
  const totalDealValue = (offer.agreedPrice ?? offer.offeredPrice) * finalQty;
  const remaining = finalQty - offer.totalDelivered;
  const paymentProgress = totalDealValue > 0 ? (offer.totalPaid / totalDealValue) * 100 : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/aggregator/portal" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Offer header */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-agro-dark">{offer.productName}</h1>
            <p className="text-xs text-muted mt-0.5">
              Submitted {new Date(offer.createdAt).toLocaleDateString("en-NG")}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-[6px] text-xs font-medium flex items-center gap-1 ${cfg.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {cfg.label}
          </span>
        </div>

        {/* Your offer */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-[8px] bg-gray-50 text-center">
            <p className="text-[10px] text-muted uppercase">Your Quantity</p>
            <p className="font-display font-bold text-lg text-agro-dark">{offer.quantity}</p>
            <p className="text-[10px] text-muted">{offer.unit}</p>
          </div>
          <div className="p-3 rounded-[8px] bg-gray-50 text-center">
            <p className="text-[10px] text-muted uppercase">Your Price</p>
            <p className="font-display font-bold text-lg text-agro-dark">{formatCurrency(offer.offeredPrice)}</p>
            <p className="text-[10px] text-muted">per {offer.unit}</p>
          </div>
        </div>
        <div className="p-2.5 rounded-[8px] bg-gray-50 mb-4 flex items-center justify-between">
          <span className="text-xs text-muted-dark">Your Total</span>
          <span className="font-display font-bold text-sm text-agro-dark">{formatCurrency(offer.offeredPrice * offer.quantity)}</span>
        </div>

        {/* Counter offer card */}
        {offer.counterPrice !== null && (
          <div className="p-3 rounded-[8px] bg-blue-50 mb-4">
            <p className="text-[10px] text-blue-600 uppercase tracking-wide mb-1">Hub&apos;s Counter Offer</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Price</span>
              <span className="font-display font-bold text-blue-700">{formatCurrency(offer.counterPrice)} / {offer.unit}</span>
            </div>
            {offer.counterQuantity !== null && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-blue-700">Quantity</span>
                <span className="font-display font-bold text-blue-700">{offer.counterQuantity} {offer.unit}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-blue-200">
              <span className="text-sm text-blue-700 font-medium">Total</span>
              <span className="font-display font-bold text-blue-700">{formatCurrency(offer.counterPrice * (offer.counterQuantity ?? offer.quantity))}</span>
            </div>
          </div>
        )}

        {/* Agreed terms card */}
        {offer.agreedPrice !== null && (
          <div className="p-3 rounded-[8px] bg-green-50 mb-4">
            <p className="text-[10px] text-green-600 uppercase tracking-wide mb-1">Agreed Terms</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Price</span>
              <span className="font-display font-bold text-green-700">{formatCurrency(offer.agreedPrice)} / {offer.unit}</span>
            </div>
            {offer.agreedQuantity !== null && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-green-700">Quantity</span>
                <span className="font-display font-bold text-green-700">{offer.agreedQuantity} {offer.unit}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-green-200">
              <span className="text-sm text-green-700 font-medium">Total</span>
              <span className="font-display font-bold text-green-700">{formatCurrency(offer.agreedPrice * (offer.agreedQuantity ?? offer.quantity))}</span>
            </div>
          </div>
        )}

        {/* Financial summary for active+ deals */}
        {["ACCEPTED", "AGREEMENT_SIGNED", "SUPPLIED", "COMPLETED"].includes(offer.status) && (
          <div className="space-y-2 mb-4">
            <div className="p-3 rounded-[8px] bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">Deal Value</span>
              </div>
              <span className="font-display font-bold text-amber-700">{formatCurrency(totalDealValue)}</span>
            </div>

            <div className="p-3 rounded-[8px] bg-emerald-50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-emerald-600">₦</span>
                  <span className="text-sm text-emerald-700">Payment</span>
                </div>
                <span className="font-display font-bold text-emerald-700">{Math.round(paymentProgress)}%</span>
              </div>
              <div className="h-2 bg-emerald-200/50 rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, paymentProgress)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Paid: {formatCurrency(offer.totalPaid)}</span>
                <span>Due: {formatCurrency(Math.max(0, totalDealValue - offer.totalPaid))}</span>
              </div>
            </div>

            {offer.advancePaid > 0 && (
              <div className="p-3 rounded-[8px] bg-blue-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">Advance Received</span>
                </div>
                <span className="font-display font-bold text-blue-700">{formatCurrency(offer.advancePaid)}</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {offer.status === "COUNTERED" && (
            <>
              <button
                onClick={() => handleAction("ACCEPT_COUNTER")}
                disabled={actionLoading}
                className="h-11 px-5 rounded-[8px] bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Accept Counter
              </button>
              <button
                onClick={() => {
                  setShowCounterBack(!showCounterBack);
                  setCounterBackPrice(String(offer.offeredPrice));
                  setCounterBackQty(String(offer.quantity));
                }}
                disabled={actionLoading}
                className="h-11 px-5 rounded-[8px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" /> Counter Back
              </button>
              <button
                onClick={() => handleAction("REJECT_COUNTER")}
                disabled={actionLoading}
                className="h-11 px-5 rounded-[8px] border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" /> Decline
              </button>
            </>
          )}

          {offer.status === "ACCEPTED" && (
            <p className="text-xs text-green-600 italic flex items-center gap-1.5 py-2 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Offer accepted — waiting for Nakowa to send agreement document
            </p>
          )}

          {offer.status === "AGREEMENT_SENT" && (
            <>
              <button
                onClick={() => setShowUploadSigned(!showUploadSigned)}
                disabled={actionLoading}
                className="h-11 px-5 rounded-[8px] bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Upload Signed Agreement
              </button>
              {offer.agreementDocUrl && (
                <a href={offer.agreementDocUrl} target="_blank" rel="noopener noreferrer" download={offer.agreementDocUrl.includes("/raw/")}
                  className="h-11 px-5 rounded-[8px] border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2">
                  <FileUp className="h-4 w-4" /> {offer.agreementDocUrl.includes("/raw/") ? "Download" : "View"} Agreement
                </a>
              )}
            </>
          )}

          {offer.status === "AGREEMENT_UPLOADED" && (
            <p className="text-xs text-orange-600 italic flex items-center gap-1.5 py-2 font-medium">
              <FileCheck className="h-3.5 w-3.5" /> Signed agreement uploaded — waiting for Nakowa to review and approve
            </p>
          )}

          {offer.status === "PENDING" && (
            <button
              onClick={() => handleAction("WITHDRAW")}
              disabled={actionLoading}
              className="h-11 px-5 rounded-[8px] border border-gray-200 text-muted-dark text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Withdraw Offer
            </button>
          )}

          {offer.status === "AGREEMENT_SIGNED" && (
            <p className="text-xs text-purple-600 italic flex items-center gap-1.5 py-2 font-medium">
              <Truck className="h-3.5 w-3.5" /> Agreement signed — delivering goods to Nakowa
            </p>
          )}

          {offer.status === "SUPPLIED" && (
            <p className="text-xs text-teal-600 flex items-center gap-1.5 py-2 font-medium">
              <PackageCheck className="h-3.5 w-3.5" /> All goods supplied — awaiting final payment
            </p>
          )}

          {offer.status === "COMPLETED" && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5 py-2 font-medium">
              <CircleCheckBig className="h-3.5 w-3.5" /> Deal completed successfully
            </p>
          )}

          {offer.status === "REJECTED" && (
            <div>
              <p className="text-sm text-red-500 italic py-2">This offer was rejected.</p>
              <Link
                href="/aggregator/portal/offers/new"
                className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mt-1"
              >
                Submit a new offer
              </Link>
            </div>
          )}
        </div>

        {/* Rejection reason alert */}
        {offer.agreementRejectionReason && offer.status === "AGREEMENT_SENT" && (
          <div className="mt-4 p-4 rounded-[8px] bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Agreement Rejected</p>
                <p className="text-sm text-red-600 mt-1">{offer.agreementRejectionReason}</p>
                <p className="text-xs text-red-500 mt-2">Please correct the issues and re-upload your signed agreement.</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload signed agreement form */}
        {showUploadSigned && (
          <div className="mt-4 p-4 rounded-[8px] bg-indigo-50 border border-indigo-200">
            <p className="text-sm font-medium text-indigo-800 mb-1">Upload Signed Agreement</p>
            <p className="text-xs text-indigo-600 mb-3">Download the agreement, sign it, then upload the signed copy below.</p>
            <div className="mb-3">
              <CloudinaryUpload
                value={signedDocUrl}
                onUploaded={(url) => setSignedDocUrl(url)}
                onChange={(url) => setSignedDocUrl(url)}
                label="Signed Document (PDF or Image)"
                accept="image/*,.pdf"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!signedDocUrl) return;
                  handleAction("UPLOAD_SIGNED_AGREEMENT", { signedAgreementDocUrl: signedDocUrl });
                }}
                disabled={actionLoading || !signedDocUrl}
                className="h-11 px-5 rounded-[8px] bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Submit Signed Agreement
              </button>
              <button
                onClick={() => { setShowUploadSigned(false); setSignedDocUrl(""); }}
                className="h-11 px-3 rounded-[8px] border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Counter-back form */}
        {showCounterBack && (
          <div className="mt-4 p-4 rounded-[8px] bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-3">Propose New Terms</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[11px] text-blue-700 mb-1">Price (per {offer.unit})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">NGN</span>
                  <input
                    type="number"
                    value={counterBackPrice}
                    onChange={(e) => setCounterBackPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full h-11 pl-12 pr-3 rounded-[8px] border border-blue-200 text-agro-dark text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-blue-700 mb-1">Quantity ({offer.unit})</label>
                <input
                  type="number"
                  value={counterBackQty}
                  onChange={(e) => setCounterBackQty(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="w-full h-11 px-3 rounded-[8px] border border-blue-200 text-agro-dark text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const price = parseFloat(counterBackPrice);
                  const qty = parseFloat(counterBackQty);
                  if (!price && !qty) return;
                  handleAction("COUNTER_BACK", {
                    newPrice: price || undefined,
                    newQuantity: qty || undefined,
                  });
                }}
                disabled={actionLoading}
                className="h-11 px-5 rounded-[8px] bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Send Counter
              </button>
              <button
                onClick={() => { setShowCounterBack(false); setCounterBackPrice(""); setCounterBackQty(""); }}
                className="h-11 px-3 rounded-[8px] border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product images */}
      {offer.productImages && offer.productImages.length > 0 && (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
          <h2 className="font-display font-semibold text-agro-dark mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted" /> Product Images
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {offer.productImages.map((img, i) => (
              <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <img src={img} alt={`Product ${i + 1}`} className="h-20 w-20 rounded-[8px] object-cover border border-gray-200" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Delivery progress */}
      {["AGREEMENT_SENT", "AGREEMENT_UPLOADED", "AGREEMENT_SIGNED", "SUPPLIED", "COMPLETED"].includes(offer.status) && (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
          <h2 className="font-display font-semibold text-agro-dark mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Delivery Progress
          </h2>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted mb-1.5">
              <span>{offer.totalDelivered} {offer.unit} delivered</span>
              <span>{Math.round(deliveryProgress)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, deliveryProgress)}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1.5">
              {remaining > 0
                ? `${remaining} ${offer.unit} remaining`
                : "All deliveries completed!"}
            </p>
          </div>

          {offer.deliveries.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted">No deliveries recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {offer.deliveries.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-[8px] bg-gray-50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-agro-dark">
                      {d.quantityDelivered} {d.unit}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(d.deliveryDate).toLocaleDateString("en-NG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {d.notes && (
                    <p className="text-xs text-muted max-w-[120px] truncate">{d.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Negotiation history */}
      {offer.negotiations && offer.negotiations.length > 0 && (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
          <h2 className="font-display font-semibold text-agro-dark mb-4">Negotiation History</h2>
          <div className="space-y-2.5">
            {offer.negotiations.map((n) => {
              const isYou = n.by === "AGGREGATOR";
              const actionLabels: Record<string, string> = {
                INITIAL: "You submitted",
                COUNTER: isYou ? "You countered" : "Hub countered",
                ACCEPT: isYou ? "You accepted" : "Hub accepted",
                REJECT: isYou ? "You rejected" : "Hub rejected",
                WITHDRAW: "You withdrew",
              };
              const label = actionLabels[n.action] || n.action;
              return (
                <div key={n.id} className={`p-3 rounded-[8px] ${isYou ? "bg-gray-50" : "bg-blue-50"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-agro-dark flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${isYou ? "bg-gray-200 text-gray-700" : "bg-blue-200 text-blue-700"}`}>{n.round}</span>
                      {label}
                    </p>
                    <p className="text-[10px] text-muted">{new Date(n.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-dark pl-7">
                    <span>{formatCurrency(n.price)} / {n.unit}</span>
                    <span>{n.quantity} {n.unit}</span>
                    <span className="font-medium">= {formatCurrency(n.price * n.quantity)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {offer.notes && (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
          <h3 className="font-display font-semibold text-sm text-agro-dark mb-2">Notes</h3>
          <p className="text-sm text-muted-dark">{offer.notes}</p>
        </div>
      )}
    </div>
  );
}
