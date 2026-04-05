import { getCachedSettings } from "@/lib/cache";
import { MapPin, Phone, Mail, Clock, ExternalLink, ArrowRight, Leaf, ShieldCheck, Truck, Users } from "lucide-react";
import Link from "next/link";

const VALUES = [
  { icon: ShieldCheck, title: "Quality Assured", desc: "We source only genuine, certified agricultural products from trusted suppliers." },
  { icon: Truck, title: "Reliable Supply", desc: "Multiple warehouses and shops to ensure your supplies are always available." },
  { icon: Users, title: "Expert Support", desc: "Experienced team ready to advise on the right products for your farming needs." },
];

export default async function AboutPage() {
  const settings = await getCachedSettings();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="bg-agro-dark rounded-[12px] p-8 sm:p-12 mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-4">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Lafia, Nasarawa State</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-frost-white mb-4">
            About <span className="text-primary">Agro Hub</span>
          </h1>
          <p className="text-frost-white/70 leading-relaxed">
            {settings?.aboutText ??
              "Agro Hub is a leading agricultural supplies business in Nasarawa State, Nigeria. We provide quality herbicides, pesticides, fertilizers, seeds, grains, tillers, sprayers, and farming equipment to farmers and agribusinesses across the region."}
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="mb-12">
        <h2 className="font-display font-bold text-xl text-agro-dark mb-6">Why Choose Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
              <div className="h-12 w-12 rounded-[10px] bg-primary/10 flex items-center justify-center mb-4">
                <v.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-agro-dark text-lg mb-2">{v.title}</h3>
              <p className="text-sm text-muted-dark leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
          <h3 className="font-display font-semibold text-agro-dark text-lg mb-5">Get in Touch</h3>
          <div className="space-y-4">
            {settings?.address && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-[8px] bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted mb-0.5">Address</p>
                  <p className="text-sm text-agro-dark">{settings.address}</p>
                </div>
              </div>
            )}
            {settings?.phone && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-[8px] bg-primary/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted mb-0.5">Phone</p>
                  <a href={`tel:${settings.phone}`} className="text-sm text-agro-dark hover:text-primary transition-colors">
                    {settings.phone}
                  </a>
                </div>
              </div>
            )}
            {settings?.email && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-[8px] bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted mb-0.5">Email</p>
                  <a href={`mailto:${settings.email}`} className="text-sm text-agro-dark hover:text-primary transition-colors">
                    {settings.email}
                  </a>
                </div>
              </div>
            )}
            {settings?.googleMapsUrl && (
              <a href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2">
                <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
              </a>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-agro-dark text-lg">Opening Hours</h3>
          </div>
          <div className="space-y-0">
            {[
              { day: "Monday - Friday", time: "8:00 AM - 6:00 PM" },
              { day: "Saturday", time: "8:00 AM - 4:00 PM" },
              { day: "Sunday", time: "Closed" },
            ].map(({ day, time }) => (
              <div key={day} className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-muted-dark">{day}</span>
                <span className="text-sm text-agro-dark font-medium">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary rounded-[12px] p-8 text-center">
        <h2 className="font-display font-bold text-2xl text-white mb-3">Ready to Order?</h2>
        <p className="text-white/80 mb-6">Browse our catalog and get the supplies you need</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/products" className="h-14 px-8 rounded-[8px] bg-white text-primary font-display font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
            Browse Products <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" className="h-14 px-8 rounded-[8px] border border-white/30 text-white font-display font-semibold hover:bg-white/10 transition-colors flex items-center justify-center">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
