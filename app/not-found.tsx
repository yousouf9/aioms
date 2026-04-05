import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-agro-dark flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mb-8">
          <Image src="/logo-light.svg" alt="Agro Hub" width={160} height={44} className="h-11 w-auto mx-auto" />
        </div>

        <p className="font-display font-bold text-[96px] leading-none text-primary/20 select-none mb-2">
          404
        </p>

        <h1 className="font-display font-bold text-xl text-frost-white mb-2">
          Page Not Found
        </h1>
        <p className="font-body text-sm text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center h-12 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/products"
            className="flex items-center justify-center h-12 rounded-[8px] border border-slate-border text-frost-white font-body text-sm hover:bg-white/5 transition-colors"
          >
            Browse Products
          </Link>
          <Link
            href="/track-order"
            className="flex items-center justify-center h-12 rounded-[8px] border border-slate-border text-frost-white font-body text-sm hover:bg-white/5 transition-colors"
          >
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}
