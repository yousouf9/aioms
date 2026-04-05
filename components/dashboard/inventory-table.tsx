"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, Edit2, ArrowUpCircle, ArrowDownCircle, BarChart2, FolderPlus, Trash2, Loader2 } from "lucide-react";
import { ActionMenu, ActionMenuItem } from "./action-menu";
import { formatCurrency, cn } from "@/lib/utils";
import { InventoryReport } from "./inventory-report";
import { CloudinaryUpload } from "./cloudinary-upload";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  imageUrl?: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  totalStock: number;
  isLowStock: boolean;
  category: { id?: string; name: string };
  locations: Array<{ name: string; type: "warehouse" | "shop"; quantity: number; id?: string }>;
  warehouseStock: number;
  shopStock: number;
}

interface Warehouse {
  id: string;
  name: string;
  type: "AGRO_INPUT" | "GRAIN";
}

interface Shop {
  id: string;
  name: string;
  warehouse: { name: string };
}

interface Props {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  shops: Shop[];
}

type InventoryTab = "PRODUCTS" | "REPORT";

export function InventoryTable({ products, categories: initialCategories, warehouses, shops }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<InventoryTab>("PRODUCTS");
  const [showAdd, setShowAdd] = useState(false);
  const [showStock, setShowStock] = useState<Product | null>(null);
  const [showEdit, setShowEdit] = useState<Product | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const lowStockCount = products.filter((p) => p.isLowStock).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Inventory</h1>
          <p className="font-body text-sm text-muted mt-0.5">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {lowStockCount > 0 && (
              <span className="ml-2 text-status-pending font-medium">· {lowStockCount} low stock</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowCategories(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50 transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            Categories
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-[10px] w-fit">
        <button
          onClick={() => { setActiveTab("PRODUCTS"); setSearch(""); }}
          className={cn(
            "px-4 h-9 rounded-[8px] font-body text-sm font-medium transition-colors",
            activeTab === "PRODUCTS"
              ? "bg-white text-agro-dark shadow-sm"
              : "text-muted hover:text-agro-dark"
          )}
        >
          Products
        </button>
        <button
          onClick={() => { setActiveTab("REPORT"); setSearch(""); }}
          className={cn(
            "px-4 h-9 rounded-[8px] font-body text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === "REPORT"
              ? "bg-white text-agro-dark shadow-sm"
              : "text-muted hover:text-agro-dark"
          )}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Report
        </button>
      </div>

      {activeTab === "REPORT" ? (
        <InventoryReport />
      ) : (
      <>
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 sm:max-w-xs h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-12 text-center">
          <p className="font-body text-muted">
            {search || selectedCategory ? "No products match your filter." : "No products yet. Add the first one."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className={cn(
                "bg-white rounded-[12px] border shadow-card p-4",
                p.isLowStock ? "border-amber-300" : "border-gray-200"
              )}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-body font-semibold text-agro-dark">{p.name}</p>
                      {p.isLowStock && <AlertTriangle className="h-4 w-4 text-status-pending" />}
                    </div>
                    <p className="font-body text-xs text-muted">{p.category.name} · {p.unit}</p>
                  </div>
                  <ProductActions
                    product={p}
                    onEdit={() => setShowEdit(p)}
                    onStock={() => setShowStock(p)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body text-xs text-muted">Total Stock</p>
                    <p className={cn("font-display font-bold text-lg", p.isLowStock ? "text-status-pending" : "text-agro-dark")}>
                      {p.totalStock} <span className="text-sm font-normal text-muted">{p.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-xs text-muted">Selling Price</p>
                    <p className="font-display font-semibold text-primary">{formatCurrency(p.sellingPrice)}</p>
                  </div>
                </div>
                {p.locations.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {p.locations.map((l) => (
                      <span
                        key={`${l.type}-${l.name}`}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-xs",
                          l.type === "warehouse" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        )}
                      >
                        <span className="text-muted">{l.name}</span>
                        <span className="font-semibold text-agro-dark">{l.quantity}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-xs text-muted mt-3">Not stocked anywhere</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Product", "Category", "Stock", "Locations", "Cost Price", "Sell Price", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={cn(
                    "border-b border-gray-50 last:border-0 transition-colors",
                    p.isLowStock ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-gray-50/60"
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-medium text-agro-dark">{p.name}</p>
                        {p.isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-status-pending" />}
                      </div>
                      <p className="font-body text-xs text-muted">{p.unit}</p>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">{p.category.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-display font-semibold text-sm",
                        p.isLowStock ? "text-status-pending" : "text-agro-dark"
                      )}>
                        {p.totalStock}
                      </span>
                      <span className="font-body text-xs text-muted ml-1">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.locations.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {p.locations.map((l) => (
                            <span
                              key={`${l.type}-${l.name}`}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-xs",
                                l.type === "warehouse" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                              )}
                            >
                              <span className="text-muted">{l.name}</span>
                              <span className="font-semibold text-agro-dark">{l.quantity}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-body text-xs text-muted">Not stocked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-agro-dark">{formatCurrency(p.costPrice)}</td>
                    <td className="px-4 py-3 font-display font-semibold text-primary">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3">
                      <ProductActions
                        product={p}
                        onEdit={() => setShowEdit(p)}
                        onStock={() => setShowStock(p)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </>
      )}

      {showAdd && (
        <ProductFormModal
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
        />
      )}

      {showEdit && (
        <EditProductModal
          product={showEdit}
          onClose={() => setShowEdit(null)}
          onSaved={() => { setShowEdit(null); router.refresh(); }}
        />
      )}

      {showStock && (
        <StockModal
          product={showStock}
          warehouses={warehouses}
          shops={shops}
          onClose={() => setShowStock(null)}
          onSaved={() => { setShowStock(null); router.refresh(); }}
        />
      )}

      {showCategories && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowCategories(false)}
          onUpdated={(cats) => { setCategories(cats); router.refresh(); }}
        />
      )}
    </div>
  );
}

function ProductActions({ product, onEdit, onStock }: { product: Product; onEdit: () => void; onStock: () => void }) {
  return (
    <ActionMenu>
      {(close) => (
        <>
          <ActionMenuItem onClick={() => { onStock(); close(); }} icon={<ArrowUpCircle className="h-4 w-4 text-green-600" />} label="Add Stock" />
          <ActionMenuItem onClick={() => { onEdit(); close(); }} icon={<Edit2 className="h-4 w-4 text-muted" />} label="Edit Product" />
          <ActionMenuItem onClick={() => { onStock(); close(); }} icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />} label="Remove Stock" />
        </>
      )}
    </ActionMenu>
  );
}

function ProductFormModal({ categories, onClose, onSaved }: {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    categoryId: categories[0]?.id ?? "",
    unit: "PIECE",
    costPrice: "",
    sellingPrice: "",
    lowStockThreshold: "5",
    description: "",
    imageUrl: "",
    isPublic: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) {
      setError("No categories available. Please create a category first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Product</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <CloudinaryUpload
            label="Product Image"
            value={form.imageUrl}
            onChange={(url) => set("imageUrl", url)}
          />
          <div>
            <label className="block font-body text-xs text-muted mb-1">Product Name *</label>
            <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Category *</label>
            {categories.length === 0 ? (
              <p className="text-red-500 text-sm py-2">No categories found. Please add a category first.</p>
            ) : (
              <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs text-muted mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors">
                {["PIECE", "BAG", "KG", "LITRE", "CARTON", "BOX", "BOTTLE", "SACK"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">Low Stock Alert</label>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs text-muted mb-1">Cost Price (₦) *</label>
              <input required type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">Selling Price (₦) *</label>
              <input required type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => set("isPublic", e.target.checked)} className="accent-primary" />
            <span className="font-body text-sm text-agro-dark">Show on public website</span>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProductModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product.name,
    unit: product.unit,
    costPrice: String(product.costPrice),
    sellingPrice: String(product.sellingPrice),
    lowStockThreshold: String(product.lowStockThreshold),
    imageUrl: product.imageUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/inventory/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Edit {product.name}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <CloudinaryUpload
            label="Product Image"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
          />
          {[
            { label: "Name", field: "name", type: "text" },
            { label: "Unit", field: "unit", type: "text" },
            { label: "Cost Price (₦)", field: "costPrice", type: "number" },
            { label: "Selling Price (₦)", field: "sellingPrice", type: "number" },
            { label: "Low Stock Alert", field: "lowStockThreshold", type: "number" },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="block font-body text-xs text-muted mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockModal({ product, warehouses, shops, onClose, onSaved }: {
  product: Product;
  warehouses: Warehouse[];
  shops: Shop[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!location) {
      setError("Please select a warehouse or shop");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const [kind, id] = location.split(":");
      const payload = {
        productId: product.id,
        type,
        quantity,
        note,
        ...(kind === "warehouse" ? { warehouseId: id } : { shopId: id }),
      };
      const res = await fetch("/api/dashboard/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to record");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  const typeLabels = { IN: "Add Stock", OUT: "Remove Stock", ADJUSTMENT: "Set Stock Level" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-sm bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Update Stock</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-[8px] p-3">
            <p className="font-body text-sm font-medium text-agro-dark">{product.name}</p>
            <p className="font-body text-xs text-muted">Current stock: <strong>{product.totalStock} {product.unit}</strong></p>
            {product.locations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {product.locations.map((l) => (
                  <span key={`${l.type}-${l.name}`} className="px-2 py-0.5 rounded-[6px] bg-white border border-gray-200 text-xs">
                    {l.name}: <strong>{l.quantity}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1">Location *</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="" disabled>Select location…</option>
              {warehouses.length > 0 && (
                <optgroup label="Warehouses">
                  {warehouses.map((w) => (
                    <option key={w.id} value={`warehouse:${w.id}`}>
                      {w.name} ({w.type === "AGRO_INPUT" ? "Agro Input" : "Grain"})
                    </option>
                  ))}
                </optgroup>
              )}
              {shops.length > 0 && (
                <optgroup label="Shops">
                  {shops.map((s) => (
                    <option key={s.id} value={`shop:${s.id}`}>
                      {s.name} — {s.warehouse.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1.5">Transaction Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["IN", "OUT", "ADJUSTMENT"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={cn(
                    "h-10 rounded-[8px] font-body text-xs font-medium transition-colors border",
                    type === t ? "bg-agro-dark text-frost-white border-transparent" : "bg-white text-agro-dark border-gray-200 hover:bg-gray-50"
                  )}>
                  {t === "IN" ? "Add" : t === "OUT" ? "Remove" : "Adjust"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1">
              {type === "ADJUSTMENT" ? "New Stock Level" : "Quantity"} ({product.unit}) *
            </label>
            <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          <div>
            <label className="block font-body text-xs text-muted mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Stock received from supplier"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : typeLabels[type]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageCategoriesModal({ categories, onClose, onUpdated }: {
  categories: Category[];
  onClose: () => void;
  onUpdated: (cats: Category[]) => void;
}) {
  const [cats, setCats] = useState(categories);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/inventory/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = [...cats, data.data];
        setCats(updated);
        onUpdated(updated);
        setNewName("");
      } else {
        setError(data.error ?? "Failed to add");
      }
    } catch {
      setError("Connection error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/inventory/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        const updated = cats.filter((c) => c.id !== id);
        setCats(updated);
        onUpdated(updated);
      } else {
        setError(data.error ?? "Failed to delete");
      }
    } catch {
      setError("Connection error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Product Categories</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {cats.length === 0 ? (
            <p className="font-body text-sm text-muted py-4 text-center">No categories yet. Add one below.</p>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {cats.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-[8px] bg-gray-50 border border-gray-100">
                  <span className="font-body text-sm text-agro-dark">{c.name}</span>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete category"
                  >
                    {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Herbicides, Fertilizers"
              className="flex-1 h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="h-11 px-4 rounded-[8px] bg-primary text-white font-display font-semibold text-sm disabled:opacity-60 hover:bg-primary-dark transition-colors"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>

          {error && <p className="text-red-500 font-body text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}
