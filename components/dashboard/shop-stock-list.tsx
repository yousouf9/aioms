"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface StockItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    unit: string;
    sellingPrice: number;
    lowStockThreshold: number;
    category: { name: string };
  };
}

export function ShopStockList({ stocks }: { stocks: StockItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? stocks.filter((s) =>
        s.product.name.toLowerCase().includes(search.toLowerCase()) ||
        s.product.category.name.toLowerCase().includes(search.toLowerCase())
      )
    : stocks;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="h-11 w-full pl-9 pr-3 rounded-[8px] border border-gray-200 bg-white font-body text-sm text-agro-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-muted text-sm font-body">
            {search ? `No products match "${search}".` : "No stock yet. Add stock from the Inventory page."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-[12px] border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  {["Product", "Category", "Quantity", "Selling Price", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 font-body font-medium text-muted text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((stock) => {
                  const low = stock.quantity <= stock.product.lowStockThreshold;
                  return (
                    <tr key={stock.id} className={cn(low && "bg-amber-50/30")}>
                      <td className="px-4 py-3 font-body text-agro-dark font-medium">{stock.product.name}</td>
                      <td className="px-4 py-3 font-body text-muted">{stock.product.category.name}</td>
                      <td className="px-4 py-3 font-body text-agro-dark">
                        {stock.quantity.toLocaleString()}{" "}
                        <span className="text-muted text-xs">{stock.product.unit.toLowerCase()}</span>
                      </td>
                      <td className="px-4 py-3 font-body text-agro-dark">
                        {formatCurrency(stock.product.sellingPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium", low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                          {low ? "Low" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((stock) => {
              const low = stock.quantity <= stock.product.lowStockThreshold;
              return (
                <div key={stock.id} className={cn("rounded-[12px] border border-gray-200 bg-white p-4", low && "bg-amber-50/30")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-body font-medium text-agro-dark">{stock.product.name}</h3>
                      <p className="text-xs text-muted mt-0.5">{stock.product.category.name}</p>
                    </div>
                    <span className={cn("inline-block px-2 py-0.5 rounded-[6px] text-xs font-medium", low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                      {low ? "Low" : "OK"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl font-bold text-agro-dark leading-none">{stock.quantity.toLocaleString()}</p>
                      <p className="text-xs text-muted mt-1">{stock.product.unit.toLowerCase()}</p>
                    </div>
                    <p className="text-sm text-agro-dark font-body">{formatCurrency(stock.product.sellingPrice)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
