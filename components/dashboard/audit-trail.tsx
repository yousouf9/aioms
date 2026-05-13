"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { name: string; unit: string };
  user: { name: string };
  location: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  type: string;
  product: string;
}

interface Props {
  transactions: Transaction[];
  pagination: Pagination;
  filters: Filters;
}

const TYPE_COLORS: Record<string, string> = {
  IN: "bg-green-100 text-green-700",
  OUT: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-blue-100 text-blue-700",
};

export function AuditTrailView({ transactions, pagination, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [typeFilter, setTypeFilter] = useState(filters.type);
  const [productFilter, setProductFilter] = useState(filters.product);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyFilters(type: string, product: string, page = 1) {
    const params = new URLSearchParams(searchParams.toString());
    if (type) params.set("type", type);
    else params.delete("type");
    if (product) params.set("product", product);
    else params.delete("product");
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleTypeChange(val: string) {
    setTypeFilter(val);
    applyFilters(val, productFilter);
  }

  function handleProductChange(val: string) {
    setProductFilter(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters(typeFilter, val), 400);
  }

  function goPage(p: number) {
    applyFilters(typeFilter, productFilter, p);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Audit Trail</h1>
          <p className="font-body text-sm text-muted">{pagination.total} stock movement{pagination.total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by product name…"
          value={productFilter}
          onChange={(e) => handleProductChange(e.target.value)}
          className="flex-1 sm:max-w-xs h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 font-body text-sm text-agro-dark focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Types</option>
          <option value="IN">IN (Stock Added)</option>
          <option value="OUT">OUT (Stock Removed)</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 p-10 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">No stock movements found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Date</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Type</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Product</th>
                  <th className="text-right px-4 py-3 font-display font-semibold text-agro-dark">Qty</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Location</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">By</th>
                  <th className="text-left px-4 py-3 font-display font-semibold text-agro-dark">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium", TYPE_COLORS[t.type] ?? "bg-gray-100 text-gray-600")}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-agro-dark">{t.product.name}</td>
                    <td className="px-4 py-3 text-right font-display font-semibold text-agro-dark">
                      {t.type === "OUT" ? "-" : "+"}{t.quantity} {t.product.unit.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{t.location}</td>
                    <td className="px-4 py-3 text-xs text-muted">{t.user.name}</td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate">{t.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="bg-white rounded-[12px] border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-agro-dark text-sm">{t.product.name}</p>
                    <p className="text-xs text-muted mt-0.5">{t.location}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("px-2 py-0.5 rounded-[6px] text-xs font-medium", TYPE_COLORS[t.type])}>
                      {t.type}
                    </span>
                    <p className="font-display font-bold text-sm text-agro-dark">
                      {t.type === "OUT" ? "-" : "+"}{t.quantity} {t.product.unit.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{t.user.name}</span>
                  <span>{formatDate(t.createdAt)}</span>
                </div>
                {t.note && <p className="mt-1 text-xs text-muted italic">{t.note}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => goPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <p className="font-body text-sm text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <button
            onClick={() => goPage(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page >= pagination.totalPages}
            className="h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
