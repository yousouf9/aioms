import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[8px] bg-gray-200 animate-shimmer",
        "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

/** Skeleton that mimics a product card layout */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-20 mt-2" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

/** Skeleton row for order product list */
export function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-[12px] border border-gray-200 bg-white">
      <Skeleton className="h-16 w-16 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-11 w-16 rounded-[8px]" />
    </div>
  );
}
