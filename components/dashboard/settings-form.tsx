"use client";
import { useState } from "react";
import { Check } from "lucide-react";

interface SiteSettings {
  businessName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  aboutText: string | null;
  deliveryFee: number;
  openingHours: unknown;
  deliveryAreas: string[];
}

interface Props {
  settings: SiteSettings;
}

export function SettingsForm({ settings }: Props) {
  const [form, setForm] = useState({
    businessName: settings.businessName,
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    googleMapsUrl: settings.googleMapsUrl ?? "",
    aboutText: settings.aboutText ?? "",
    deliveryFee: settings.deliveryFee ?? 0,
    openingHours: settings.openingHours ? JSON.stringify(settings.openingHours, null, 2) : "",
    deliveryAreas: Array.isArray(settings.deliveryAreas) ? settings.deliveryAreas.join(", ") : "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    // Parse openingHours JSON
    let openingHours = null;
    if (form.openingHours.trim()) {
      try {
        openingHours = JSON.parse(form.openingHours);
      } catch {
        setError("Opening hours must be valid JSON");
        setSaving(false);
        return;
      }
    }

    // Parse delivery areas from comma-separated
    const deliveryAreas = form.deliveryAreas
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          phone: form.phone,
          whatsapp: form.whatsapp,
          email: form.email,
          address: form.address,
          googleMapsUrl: form.googleMapsUrl,
          aboutText: form.aboutText,
          deliveryFee: Number(form.deliveryFee),
          openingHours,
          deliveryAreas,
        }),
      });
      const data = await res.json();
      if (data.success) setSaved(true);
      else setError(data.error ?? "Failed to save");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Business Info */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <h2 className="font-display font-semibold text-base text-agro-dark mb-4">Business Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs text-muted mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="e.g. 08012345678"
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">WhatsApp Number</label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="e.g. 2348012345678"
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@agrohub.com.ng"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              rows={2}
              placeholder="e.g. No. 10, Market Road, Lafia, Nasarawa"
              className="w-full px-3 py-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Google Maps URL</label>
            <input
              type="url"
              value={form.googleMapsUrl}
              onChange={(e) => set("googleMapsUrl", e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">About Text</label>
            <textarea
              value={form.aboutText}
              onChange={(e) => set("aboutText", e.target.value)}
              rows={3}
              placeholder="Describe your business..."
              className="w-full px-3 py-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Delivery & Operations */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <h2 className="font-display font-semibold text-base text-agro-dark mb-4">Delivery & Operations</h2>
        <div className="space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Delivery Fee (&#8358;)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.deliveryFee}
              onChange={(e) => set("deliveryFee", e.target.value)}
              placeholder="e.g. 500"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Delivery Areas</label>
            <input
              type="text"
              value={form.deliveryAreas}
              onChange={(e) => set("deliveryAreas", e.target.value)}
              placeholder="e.g. Lafia, Keffi, Nasarawa, Akwanga"
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <p className="font-body text-xs text-muted mt-1">Comma-separated list of delivery areas</p>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Opening Hours (JSON)</label>
            <textarea
              value={form.openingHours}
              onChange={(e) => set("openingHours", e.target.value)}
              rows={4}
              placeholder='{"Mon-Fri": "8:00 AM - 6:00 PM", "Sat": "9:00 AM - 4:00 PM", "Sun": "Closed"}'
              className="w-full px-3 py-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm font-mono focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="font-body text-xs text-muted mt-1">Enter opening hours as a JSON object</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-status-cancelled text-sm px-4 py-3 rounded-[8px] bg-red-50 border border-red-100">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-6 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 font-body text-sm text-status-confirmed">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
