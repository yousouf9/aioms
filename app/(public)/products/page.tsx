import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Package, Search, Filter } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";

interface Props {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const categoryId = params.category;
  const search = params.search;

  const [categories, products] = await Promise.all([
    db.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.product.findMany({
      where: {
        isActive: true,
        isPublic: true,
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-agro-dark rounded-[12px] p-8 sm:p-10 mb-8">
        <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Our Catalog</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-frost-white">Products</h1>
        <p className="text-muted text-sm mt-1">Browse our full catalog of agricultural supplies</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form className="flex-1 relative" action="/products" method="GET">
          {categoryId && <input type="hidden" name="category" value={categoryId} />}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search products..."
            className="w-full h-11 pl-10 pr-4 rounded-[8px] bg-white border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </form>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/products"
          className={`px-4 h-9 flex items-center rounded-full text-sm font-medium transition-colors ${
            !categoryId ? "bg-primary text-white" : "bg-gray-100 text-agro-dark hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.id}`}
            className={`px-4 h-9 flex items-center rounded-full text-sm font-medium transition-colors ${
              categoryId === cat.id ? "bg-primary text-white" : "bg-gray-100 text-agro-dark hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-muted font-body">No products found. Try a different category or search term.</p>
        </div>
      ) : (
        <ScrollReveal direction="up">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden card-hover group"
              >
                <div className="aspect-square placeholder-branded flex items-center justify-center img-hover-zoom">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} width={300} height={300} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-gray-300" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-primary font-medium">{product.category.name}</p>
                  <h3 className="font-display font-semibold text-agro-dark text-sm mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="font-display font-bold text-accent text-lg mt-2">
                    {formatCurrency(product.sellingPrice)}
                  </p>
                  <p className="text-muted text-xs mt-1 capitalize">per {product.unit.toLowerCase()}</p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
