import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Package, ArrowLeft, Phone, ShoppingCart, Shield, Truck, ShieldCheck } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id, isActive: true, isPublic: true },
    include: { category: true },
  });

  if (!product) notFound();

  const relatedProducts = await db.product.findMany({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      isPublic: true,
      id: { not: product.id },
    },
    take: 4,
    include: { category: { select: { name: true } } },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/products" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square placeholder-branded rounded-[12px] flex items-center justify-center overflow-hidden img-hover-zoom">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} width={600} height={600} className="w-full h-full object-cover" />
          ) : (
            <Package className="h-24 w-24 text-gray-300" />
          )}
        </div>

        {/* Details */}
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            {product.category.name}
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-agro-dark">{product.name}</h1>

          {product.description && (
            <p className="text-muted-dark text-sm mt-3 leading-relaxed">{product.description}</p>
          )}

          <div className="mt-6 p-5 rounded-[12px] bg-gray-50 border border-gray-200">
            <p className="font-display text-3xl font-bold text-accent">
              {formatCurrency(product.sellingPrice)}
            </p>
            <p className="text-muted text-sm mt-1 capitalize">per {product.unit.toLowerCase()}</p>
          </div>

          {product.sku && (
            <p className="text-muted text-xs mt-4">SKU: {product.sku}</p>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { icon: Shield, label: "Genuine Product" },
              { icon: Truck, label: "Fast Delivery" },
              { icon: ShieldCheck, label: "Secure Payment" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                <badge.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-dark font-medium">{badge.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              href={`/order?product=${product.id}`}
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors btn-press"
            >
              <ShoppingCart className="h-5 w-5" />
              Order Now
            </Link>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || ""}?text=Hi, I'm interested in ${product.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] border border-gray-200 text-agro-dark font-display font-semibold hover:bg-gray-50 transition-colors btn-press"
            >
              <Phone className="h-5 w-5" />
              Enquire via WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <ScrollReveal direction="up">
          <div className="mt-16">
            <h2 className="font-display text-xl font-bold text-agro-dark mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/products/${rp.id}`}
                  className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden card-hover group"
                >
                  <div className="aspect-square placeholder-branded flex items-center justify-center img-hover-zoom">
                    {rp.imageUrl ? (
                      <Image src={rp.imageUrl} alt={rp.name} width={300} height={300} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-display font-semibold text-agro-dark text-xs line-clamp-2 group-hover:text-primary transition-colors">
                      {rp.name}
                    </h3>
                    <p className="font-display font-bold text-accent text-sm mt-1">
                      {formatCurrency(rp.sellingPrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
