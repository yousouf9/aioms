"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldX,
  Eye,
  Clock,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  FileSignature,
  PackageCheck,
  CircleCheckBig,
} from "lucide-react";

type Offer = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  offeredPrice: number;
  agreedPrice: number | null;
  agreedQuantity: number | null;
  status: string;
  totalPaid: number;
  totalDelivered: number;
  dealValue: number;
  createdAt: string;
  _count: { deliveries: number };
};

type AggUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  profileImageUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  COUNTERED: { label: "Countered", color: "bg-blue-100 text-blue-700", icon: ArrowRightLeft },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  AGREEMENT_SENT: { label: "Doc Sent", color: "bg-indigo-100 text-indigo-700", icon: FileSignature },
  AGREEMENT_UPLOADED: { label: "Review", color: "bg-orange-100 text-orange-700", icon: Clock },
  AGREEMENT_SIGNED: { label: "Signed", color: "bg-purple-100 text-purple-700", icon: FileSignature },
  SUPPLIED: { label: "Supplied", color: "bg-teal-100 text-teal-700", icon: PackageCheck },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: CircleCheckBig },
};

export default function AggregatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AggUser | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // Fetch user's offers via the main offers API filtered by customerId
      const res = await fetch(`/api/dashboard/aggregators?customerId=${id}&limit=100`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        // Get user info from first offer's customer field
        const first = data.data[0];
        setUser({
          id: first.customer.id,
          name: first.customer.name,
          phone: first.customer.phone,
          email: null,
          address: null,
          profileImageUrl: null,
          isEmailVerified: false,
          createdAt: "",
        });
        setOffers(data.data);
      }
      // Also fetch full user details
      const userRes = await fetch(`/api/dashboard/aggregators/users?search=${id}&limit=1`);
      const userData = await userRes.json();
      // The search might not match by ID, so use the offers data as fallback
      if (userData.success && userData.data.length > 0) {
        const u = userData.data[0];
        if (u.id === id) setUser(u);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-3">Aggregator not found</p>
        <Link href="/dashboard/aggregators" className="text-primary text-sm hover:underline">Back to aggregators</Link>
      </div>
    );
  }

  const statusSummary: Record<string, number> = {};
  offers.forEach((o) => { statusSummary[o.status] = (statusSummary[o.status] || 0) + 1; });
  const totalValue = offers.filter((o) => o.dealValue > 0).reduce((s, o) => s + o.dealValue, 0);
  const totalPaid = offers.reduce((s, o) => s + o.totalPaid, 0);

  return (
    <div>
      <Link href="/dashboard/aggregators" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-5">
        <ArrowLeft className="h-4 w-4" /> Back to Aggregators
      </Link>

      {/* User profile card */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-6">
        <div className="flex items-start gap-4">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.name} className="h-16 w-16 rounded-full object-cover border-2 border-gray-200" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-primary text-2xl">{user.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-xl font-bold text-agro-dark">{user.name}</h1>
              {user.isEmailVerified ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <ShieldX className="h-3.5 w-3.5" /> Unverified
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-dark">
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted" /> {user.phone}</span>
              {user.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-muted" /> {user.email}</span>}
              {user.address && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted" /> {user.address}</span>}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-agro-dark">{offers.length}</p>
            <p className="text-xs text-muted">Total Offers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-primary">{statusSummary["AGREEMENT_SIGNED"] || 0 + (statusSummary["SUPPLIED"] || 0)}</p>
            <p className="text-xs text-muted">Active Deals</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-display font-bold text-amber-600">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted">Total Deal Value</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-display font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-muted">Total Paid</p>
          </div>
        </div>
      </div>

      {/* Offers table */}
      <h2 className="font-display font-semibold text-agro-dark mb-3">Offers</h2>
      {offers.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-10 text-center">
          <p className="text-muted">No offers from this aggregator yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden md:table-cell">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark">Price</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-dark hidden lg:table-cell">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-dark">Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  const displayPrice = o.agreedPrice ?? o.offeredPrice;
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-agro-dark">{o.productName}</td>
                      <td className="px-4 py-3 text-muted-dark hidden md:table-cell">{o.agreedQuantity ?? o.quantity} {o.unit}</td>
                      <td className="px-4 py-3 font-medium text-agro-dark">{formatCurrency(displayPrice)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted hidden lg:table-cell text-xs">{formatDate(new Date(o.createdAt))}</td>
                      <td className="px-4 py-3 text-center">
                        <Link href={`/dashboard/aggregators/offers/${o.id}`}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-xs font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
