import Link from "next/link";
import Image from "next/image";
import { getCachedAnnouncements, getCachedCategories, getCachedProducts } from "@/lib/cache";
import { formatCurrency } from "@/lib/utils";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import {
  ArrowRight, Truck, Shield, Clock, Sprout, Warehouse,
  Phone, ShoppingCart, Package, Leaf, Handshake, UserPlus,
} from "lucide-react";

const FEATURES = [
  {
    icon: Package,
    title: "Quality Products",
    desc: "Premium herbicides, fertilizers, seeds, and machinery from trusted manufacturers.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    desc: "Order online and get your supplies delivered or pick up from our stores.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    desc: "Pay safely via cash, bank transfer, POS, or online payment.",
  },
  {
    icon: Clock,
    title: "Real-Time Stock",
    desc: "Always know what's available — our stock updates in real time.",
  },
];

const STEPS = [
  { step: "01", title: "Browse Products", desc: "Explore our catalog of agricultural supplies by category." },
  { step: "02", title: "Place Your Order", desc: "Select products, choose delivery or pickup, and submit." },
  { step: "03", title: "Get Your Supplies", desc: "Pick up from our store or get it delivered to your location." },
];

export default async function HomePage() {
  const [categories, products, announcements] = await Promise.all([
    getCachedCategories(),
    getCachedProducts(undefined, 8),
    getCachedAnnouncements(3),
  ]);

  return (
    <div className="font-body">
      {/* ─── Hero Section ──────────────────────────────────────── */}
      <section className="relative bg-agro-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sprout className="h-4 w-4 text-primary" />
              <span className="text-primary text-xs font-medium">Nasarawa State, Nigeria</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-frost-white leading-tight animate-fade-up">
              Quality Agricultural
              <span className="text-gradient block">Supplies & Inputs</span>
            </h1>
            <p className="text-muted text-base md:text-lg mt-4 mb-8 animate-fade-up delay-200 max-w-lg">
              Herbicides, fertilizers, machinery, seeds, and grains — everything your farm needs, delivered to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-up delay-300">
              <Link
                href="/products"
                className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] bg-primary text-white font-display font-semibold text-base hover:bg-primary-dark transition-colors glow-primary btn-press"
              >
                <ShoppingCart className="h-5 w-5" />
                Browse Products
              </Link>
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] border border-slate-border text-frost-white font-display font-semibold text-base hover:bg-white/5 transition-colors btn-press"
              >
                <Phone className="h-5 w-5" />
                Contact Us
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-fade-up delay-500">
            {[
              { label: "Product Categories", value: `${categories.length}+` },
              { label: "Warehouses", value: "4+" },
              { label: "Years in Business", value: "10+" },
              { label: "Happy Customers", value: "500+" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-[12px] p-4 text-center">
                <p className="font-display text-2xl font-bold text-frost-white">{stat.value}</p>
                <p className="text-muted text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ────────────────────────────────────────── */}
      {categories.length > 0 && (
        <ScrollReveal>
        <section className="py-16 bg-frost-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">What We Offer</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-agro-dark">Product Categories</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 card-hover text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Leaf className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-agro-dark text-sm">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-muted-dark text-xs mt-1 line-clamp-2">{cat.description}</p>
                  )}
                  <p className="text-primary text-xs font-medium mt-2 group-hover:underline">
                    {(cat as unknown as { _count: { products: number } })._count?.products || 0} products
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        </ScrollReveal>
      )}

      {/* ─── Featured Products ─────────────────────────────────── */}
      {products.length > 0 && (
        <ScrollReveal>
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Top Picks</p>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-agro-dark">Featured Products</h2>
              </div>
              <Link href="/products" className="hidden md:flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden card-hover group"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center img-hover-zoom">
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
            <div className="md:hidden text-center mt-6">
              <Link href="/products" className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                View All Products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
        </ScrollReveal>
      )}

      {/* ─── Features ──────────────────────────────────────────── */}
      <ScrollReveal direction="up" delay={100}>
      <section className="py-16 bg-frost-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Why Choose Us</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-agro-dark">Your Trusted Agro Partner</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 text-center card-hover">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-agro-dark text-sm">{f.title}</h3>
                  <p className="text-muted-dark text-xs mt-2 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ─── How It Works ──────────────────────────────────────── */}
      <ScrollReveal>
      <section className="py-16 bg-agro-dark">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Simple Process</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-frost-white">Order in 3 Easy Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="glass rounded-[12px] p-6 text-center">
                <span className="inline-block font-display text-4xl font-bold text-primary/30 mb-2">{s.step}</span>
                <h3 className="font-display font-semibold text-frost-white text-base mb-2">{s.title}</h3>
                <p className="text-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ─── Become an Aggregator CTA ─────────────────────────── */}
      <ScrollReveal>
      <section className="py-16 bg-agro-deep">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Handshake className="h-4 w-4 text-primary" />
                <span className="text-primary text-xs font-medium">Aggregator Program</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-frost-white mb-3">
                Want to Supply Products to Nakowa?
              </h2>
              <p className="text-muted text-sm md:text-base mb-6 leading-relaxed">
                Join our aggregator network and supply grains, beans, rice, maize, and other agricultural
                commodities. Get fair pricing, advance funding, and transparent deal tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/aggregator/register"
                  className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  Become a Customer
                </Link>
                <Link
                  href="/aggregator"
                  className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] border border-slate-border text-frost-white font-display font-semibold hover:bg-white/5 transition-colors"
                >
                  Learn More <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Handshake, title: "Fair Negotiation", desc: "Submit your price, negotiate transparently" },
                { icon: Shield, title: "Secure Agreements", desc: "Digital agreements protect both parties" },
                { icon: Truck, title: "Delivery Tracking", desc: "Record and monitor every delivery" },
                { icon: Warehouse, title: "Advance Funding", desc: "Get advances to support your operations" },
              ].map((b) => (
                <div key={b.title} className="glass rounded-[12px] p-4">
                  <b.icon className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-display font-semibold text-frost-white text-xs">{b.title}</h3>
                  <p className="text-muted text-[11px] mt-1">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ─── Announcements ─────────────────────────────────────── */}
      {announcements.length > 0 && (
        <ScrollReveal>
        <section className="py-16 bg-frost-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Stay Updated</p>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-agro-dark">Latest News</h2>
              </div>
              <Link href="/announcements" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((a) => (
                <div key={a.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
                  {a.pinned && (
                    <span className="inline-block px-2 py-0.5 rounded-[6px] bg-accent/10 text-accent text-xs font-medium mb-2">Pinned</span>
                  )}
                  <h3 className="font-display font-semibold text-agro-dark text-sm">{a.title}</h3>
                  <p className="text-muted-dark text-xs mt-2 line-clamp-3">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </ScrollReveal>
      )}

      {/* ─── CTA ───────────────────────────────────────────────── */}
      <ScrollReveal>
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Warehouse className="h-12 w-12 text-white/80 mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Stock Up?
          </h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Browse our full catalog of agricultural supplies or contact us directly for bulk orders and special pricing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/products"
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] bg-white text-primary font-display font-semibold hover:bg-gray-50 transition-colors btn-press"
            >
              <ShoppingCart className="h-5 w-5" />
              Browse Products
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-[8px] border-2 border-white text-white font-display font-semibold hover:bg-white/10 transition-colors btn-press"
            >
              <Phone className="h-5 w-5" />
              Contact Us
            </Link>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
}
