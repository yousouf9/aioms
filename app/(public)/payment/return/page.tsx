"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, MessageCircle, Clock } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type VerifyResult = {
  status: "PAID" | "UNPAID" | "PARTIAL" | "REFUNDED";
  amount: number;
  source: string;
  confirmedAt: string | null;
  order: {
    orderCode: string;
    customerName: string;
    status: string;
    total: number;
  } | null;
};

export default function PaymentReturnPage() {
  return (
    <Suspense>
      <PaymentReturnContent />
    </Suspense>
  );
}

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const ref =
    searchParams.get("reference") ??
    searchParams.get("transactionRef") ??
    searchParams.get("tx_ref") ??
    searchParams.get("valueRef") ??
    "";

  useEffect(() => {
    if (!ref) {
      setVerifying(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    let retries = 0;
    const MAX_RETRIES = 6;

    async function verify() {
      try {
        const res = await fetch(`/api/public/payment/verify?ref=${encodeURIComponent(ref)}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.success) {
          if (data.data.status === "UNPAID" && retries < MAX_RETRIES) {
            retries++;
            setAttempts(retries);
            setTimeout(verify, 3000);
            return;
          }
          setResult(data.data);
          setVerifying(false);
        } else {
          setNotFound(true);
          setVerifying(false);
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setVerifying(false);
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [ref]);

  if (verifying) {
    return (
      <div className="min-h-[80svh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="font-display font-semibold text-agro-dark text-lg mb-1">Confirming your payment...</p>
          <p className="text-sm text-muted">
            {attempts > 0
              ? `Waiting for confirmation... (${attempts}/6)`
              : "Please wait, this takes a few seconds."}
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !result) {
    return (
      <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white rounded-[12px] border border-gray-200 shadow-card p-6 text-center">
          <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="font-display font-bold text-xl text-agro-dark mb-2">Still Processing</h1>
          <p className="text-sm text-muted-dark mb-6">
            We couldn&apos;t confirm your payment yet. If you completed payment, it will be confirmed automatically within a few minutes.
          </p>
          {ref && (
            <div className="bg-gray-50 rounded-[8px] p-3 mb-6">
              <p className="text-xs text-muted mb-0.5">Reference</p>
              <p className="text-xs text-agro-dark font-medium break-all">{ref}</p>
            </div>
          )}
          <div className="space-y-3">
            <Link href="/track-order" className="flex items-center justify-center w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors">
              Track Your Order
            </Link>
            <Link href="/" className="flex items-center justify-center w-full h-12 rounded-[8px] border border-gray-200 text-agro-dark text-sm hover:bg-gray-50 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = result.status === "PAID";

  if (isPaid) {
    return (
      <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 text-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-display font-bold text-2xl text-agro-dark mb-2">Payment Confirmed!</h1>
            <p className="text-sm text-muted-dark">
              Your order has been confirmed. We&apos;ll start processing it right away.
            </p>
          </div>

          {result.order && (
            <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 mb-4">
              <div className="bg-gray-50 rounded-[8px] p-4 mb-5 text-center">
                <p className="text-xs text-muted mb-1">Order Code</p>
                <p className="font-display font-bold text-3xl text-primary tracking-widest">{result.order.orderCode}</p>
              </div>

              <ul className="space-y-2">
                <li className="flex justify-between gap-2">
                  <span className="text-xs text-muted">Name</span>
                  <span className="text-xs text-agro-dark font-medium">{result.order.customerName}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-xs text-muted">Amount Paid</span>
                  <span className="text-xs text-primary font-medium">{formatCurrency(result.amount)}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-xs text-muted">Status</span>
                  <span className="text-xs text-agro-dark font-medium">{result.order.status}</span>
                </li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <Link href="/track-order" className="flex items-center justify-center w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors">
              Track Your Order
            </Link>
            <Link href="/products" className="flex items-center justify-center w-full h-12 rounded-[8px] border border-gray-200 text-agro-dark text-sm hover:bg-gray-50 transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Failed
  return (
    <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 text-center">
          <div className="h-20 w-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="font-display font-bold text-2xl text-agro-dark mb-2">Payment Not Completed</h1>
          <p className="text-sm text-muted-dark mb-5">
            We didn&apos;t receive confirmation of your payment. No charge has been made.
          </p>
          {ref && (
            <div className="bg-gray-50 rounded-[8px] p-3 mb-5">
              <p className="text-xs text-muted mb-0.5">Reference</p>
              <p className="text-xs text-agro-dark font-medium break-all">{ref}</p>
            </div>
          )}
          <div className="space-y-3">
            <Link href="/products" className="flex items-center justify-center w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors">
              Try Again
            </Link>
            <Link href="/track-order" className="flex items-center justify-center w-full h-12 rounded-[8px] border border-gray-200 text-agro-dark text-sm hover:bg-gray-50 transition-colors">
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
