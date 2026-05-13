import { MapPin, Phone, Clock, MessageCircle, Mail, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getCachedSettings } from "@/lib/cache";

const FAQS = [
  {
    q: "How do I place an order?",
    a: "Browse our product catalog, add items to your order, fill in your delivery details, and confirm. You'll receive an order code immediately.",
  },
  {
    q: "Can I pay online?",
    a: "Yes! We accept card payments, bank transfers, and USSD via our secure payment gateway. You can also choose to pay on pickup.",
  },
  {
    q: "How do I track my order?",
    a: "Visit the Track Order page and enter your order code and phone number. Your order status will be displayed instantly.",
  },
  {
    q: "Do you offer delivery?",
    a: "Yes, we offer delivery within Lafia and surrounding areas. Delivery fees vary based on your location.",
  },
  {
    q: "Can I buy on credit?",
    a: "Yes, we offer credit facilities for trusted customers. Visit our shop or contact us to discuss credit terms.",
  },
  {
    q: "What products do you stock?",
    a: "We stock herbicides, pesticides, fertilizers, seeds, grains, tillers, sprayers, and other farming equipment and supplies.",
  },
];

export default async function ContactPage() {
  const settings = await getCachedSettings();
  const whatsapp = settings?.whatsapp || "";
  const phone = settings?.phone || "";
  const email = settings?.email || "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-4">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">We&apos;re here to help</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-agro-dark mb-3">
          Get in Touch
        </h1>
        <p className="text-muted-dark max-w-md mx-auto">
          Questions about products, orders, or pricing? Reach out — we respond fast.
        </p>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=Hello%20Nakowa%2C%20I%20have%20a%20question.`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary rounded-[12px] p-6 hover:bg-primary-dark transition-all active:scale-[0.98]"
          >
            <div className="h-12 w-12 rounded-[10px] bg-white/15 flex items-center justify-center mb-4">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-display font-bold text-white text-lg mb-1">WhatsApp</h3>
            <p className="text-sm text-white/70 mb-3">Fastest response — usually within minutes</p>
            <span className="inline-flex items-center gap-1 text-sm text-white font-semibold">
              Chat Now <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </a>
        )}

        {phone && (
          <a
            href={`tel:${phone}`}
            className="bg-white border border-gray-200 shadow-card rounded-[12px] p-6 hover:border-primary/40 transition-all"
          >
            <div className="h-12 w-12 rounded-[10px] bg-primary/10 flex items-center justify-center mb-4">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-agro-dark text-lg mb-1">Call Us</h3>
            <p className="text-sm text-muted-dark mb-3">Speak directly with our team</p>
            <span className="text-sm text-primary font-medium">{phone}</span>
          </a>
        )}

        {email && (
          <a
            href={`mailto:${email}`}
            className="bg-white border border-gray-200 shadow-card rounded-[12px] p-6 hover:border-primary/40 transition-all"
          >
            <div className="h-12 w-12 rounded-[10px] bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-agro-dark text-lg mb-1">Email</h3>
            <p className="text-sm text-muted-dark mb-3">For detailed enquiries</p>
            <span className="text-sm text-primary font-medium">{email}</span>
          </a>
        )}
      </div>

      {/* Location & Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-agro-dark text-lg">Our Location</h3>
          </div>
          <p className="text-sm text-agro-dark leading-relaxed mb-4">
            {settings?.address || "No. 42 behind Romantic Bakery, Anguwan Jaba, Lafia, Nasarawa State, Nigeria"}
          </p>
          {settings?.googleMapsUrl && (
            <a
              href={settings.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-[8px] border border-primary/30 text-primary text-sm hover:bg-primary/5 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" /> Open in Google Maps
            </a>
          )}
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-agro-dark text-lg">Opening Hours</h3>
          </div>
          <div className="space-y-0">
            {[
              { day: "Every Day", time: "7:00 AM - 6:00 PM" },
            ].map(({ day, time }) => (
              <div key={day} className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-muted-dark">{day}</span>
                <span className="text-sm text-agro-dark font-medium">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-xl text-agro-dark">Frequently Asked Questions</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
              <h3 className="font-display font-semibold text-agro-dark text-sm mb-2">{q}</h3>
              <p className="text-sm text-muted-dark leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-50 rounded-[12px] border border-gray-200 p-6 text-center">
        <p className="text-muted-dark mb-4">Ready to get your farming supplies?</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/products" className="h-11 px-6 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
            Browse Products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/track-order" className="h-11 px-6 rounded-[8px] border border-gray-200 text-agro-dark font-display font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center">
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}
