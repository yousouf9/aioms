"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="font-body text-sm text-muted">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="h-11 w-11 flex items-center justify-center rounded-[8px] border border-gray-200 text-agro-dark hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers — hidden on mobile, shown on sm+ */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="h-11 w-11 flex items-center justify-center font-body text-sm text-muted"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goTo(p as number)}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-[8px] font-body text-sm transition-colors",
                  p === page
                    ? "bg-primary text-agro-dark font-semibold"
                    : "border border-gray-200 text-agro-dark hover:bg-gray-50"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="h-11 w-11 flex items-center justify-center rounded-[8px] border border-gray-200 text-agro-dark hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
