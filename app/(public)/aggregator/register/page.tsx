"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, Upload, Camera, X, ChevronRight, Users, Wheat, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPES = [
  {
    value: "AGGREGATOR",
    label: "Aggregator",
    description: "Supply grains, beans, rice, maize and other agricultural commodities",
    icon: Wheat,
  },
  {
    value: "AGRO_INPUT",
    label: "Agro Input Customer",
    description: "Purchase seeds, fertilizers, pesticides and other farm inputs",
    icon: ShoppingBag,
  },
  {
    value: "BUYER",
    label: "Buyer",
    description: "Buy agricultural produce and commodities for personal or commercial use",
    icon: Users,
  },
];

export default function CustomerRegisterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"type" | "details">("type");
  const [customerType, setCustomerType] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", confirmPassword: "", address: "",
  });
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) { setError("Image upload not configured"); return; }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      fd.append("folder", "aggregator-profiles");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.secure_url) {
        setProfileImageUrl(data.secure_url);
      } else {
        setError("Image upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
      setError("Name, phone, email, and password are required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/aggregator/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          address: form.address.trim() || undefined,
          profileImageUrl: profileImageUrl || undefined,
          customerType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/aggregator/verify-email");
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: select customer type
  if (step === "type") {
    return (
      <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-agro-dark">Become a Customer</h1>
            <p className="text-muted text-sm mt-1">Select the type of account that best describes you</p>
          </div>

          <div className="space-y-3">
            {CUSTOMER_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => { setCustomerType(type.value); setStep("details"); }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-[12px] border-2 text-left transition-all",
                    customerType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white hover:border-primary/40 hover:bg-gray-50"
                  )}
                >
                  <div className="h-12 w-12 rounded-[8px] bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-agro-dark">{type.label}</p>
                    <p className="font-body text-xs text-muted mt-0.5 leading-relaxed">{type.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted shrink-0" />
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{" "}
            <Link href="/aggregator/login" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const selectedType = CUSTOMER_TYPES.find((t) => t.value === customerType);

  // Step 2: fill in details
  return (
    <div className="min-h-[80svh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-agro-dark">Create Account</h1>
          {selectedType && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {selectedType.label}
              <button
                type="button"
                onClick={() => setStep("type")}
                className="ml-1 text-primary/60 hover:text-primary transition-colors"
                title="Change type"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-6 space-y-4">
          {/* Profile image */}
          <div className="flex flex-col items-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative h-24 w-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary transition-colors group"
            >
              {profileImageUrl ? (
                <>
                  <Image src={profileImageUrl} alt="Profile" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </>
              ) : uploading ? (
                <Loader2 className="h-6 w-6 text-muted animate-spin" />
              ) : (
                <div className="text-center">
                  <Upload className="h-5 w-5 text-muted mx-auto" />
                  <p className="text-[10px] text-muted mt-1">Photo</p>
                </div>
              )}
            </button>
            {profileImageUrl && (
              <button
                type="button"
                onClick={() => setProfileImageUrl("")}
                className="text-xs text-red-500 mt-1 hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
            <p className="text-[11px] text-muted mt-1">Upload a profile photo (optional)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your full name"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Phone Number *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="080XXXXXXXX"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@email.com"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-[11px] text-muted mt-1">Required for account verification</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Address (optional)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Your location"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Min 6 characters"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-agro-dark mb-1.5">Confirm Password *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="Repeat password"
              className="w-full h-12 px-4 rounded-[8px] border border-gray-200 text-agro-dark text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full h-12 rounded-[8px] bg-primary text-white font-display font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/aggregator/login" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
