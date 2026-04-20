import Link from "next/link";
import {
  Handshake,
  TrendingUp,
  Shield,
  Truck,
  Banknote,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Fair Pricing",
    description: "Submit your price, negotiate transparently, and agree on terms that work for both sides.",
  },
  {
    icon: Banknote,
    title: "Advance Funding",
    description: "Receive advance payments to support your supply chain and farming operations.",
  },
  {
    icon: Shield,
    title: "Secure Agreements",
    description: "Digital agreements protect both parties. Track every delivery and payment.",
  },
  {
    icon: Truck,
    title: "Delivery Tracking",
    description: "Record and monitor deliveries in real-time. Know exactly where you stand.",
  },
];

const STEPS = [
  { num: "1", title: "Register", description: "Create your free aggregator account" },
  { num: "2", title: "Submit Offer", description: "Propose products, quantity, and your price" },
  { num: "3", title: "Negotiate", description: "Review counter-offers and reach agreement" },
  { num: "4", title: "Deliver & Get Paid", description: "Deliver products and track payments" },
];

export default function AggregatorLandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-agro-dark py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Handshake className="h-4 w-4 text-primary" />
            <span className="text-primary text-sm font-medium">Aggregator Program</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
            Supply Agricultural Products to{" "}
            <span className="text-primary">Nakowa</span>
          </h1>
          <p className="text-muted text-base md:text-lg max-w-2xl mx-auto mb-8">
            Join our aggregator network. Supply grains, beans, rice, maize, and other agricultural commodities
            with fair pricing, advance funding, and transparent deal tracking.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/aggregator/register"
              className="flex items-center gap-2 h-14 px-8 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors"
            >
              <UserPlus className="h-5 w-5" /> Register as Aggregator
            </Link>
            <Link
              href="/aggregator/login"
              className="flex items-center gap-2 h-14 px-8 rounded-[8px] border border-slate-border text-white font-display font-semibold hover:bg-white/5 transition-colors"
            >
              <LogIn className="h-5 w-5" /> Login to Portal
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-frost-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-agro-dark text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-white font-display font-bold text-xl flex items-center justify-center mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-display font-semibold text-agro-dark text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-agro-dark text-center mb-12">
            Why Partner With Us
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
                <div className="h-11 w-11 rounded-[8px] bg-primary/10 flex items-center justify-center mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-agro-dark mb-1">{b.title}</h3>
                <p className="text-sm text-muted-dark">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-agro-dark">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Start Supplying?
          </h2>
          <p className="text-muted mb-8">
            Create your account in under a minute and submit your first offer today.
          </p>
          <Link
            href="/aggregator/register"
            className="inline-flex items-center gap-2 h-14 px-8 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors"
          >
            Get Started <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
