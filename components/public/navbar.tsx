"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, User, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/products",      label: "Products"      },
  { href: "/announcements",  label: "News"          },
  { href: "/track-order",    label: "Track Order"   },
  { href: "/about",          label: "About"         },
  { href: "/contact",        label: "Contact"       },
];

type AggregatorInfo = {
  name: string;
  profileImageUrl: string | null;
} | null;

type Announcement = {
  id: string;
  title: string;
};

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [aggregator, setAggregator] = useState<AggregatorInfo>(null);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<Announcement[]>([]);
  const [tickerDismissed, setTickerDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/public/aggregator/auth/me")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.success) {
          setAggregator({
            name: data.data.name,
            profileImageUrl: data.data.profileImageUrl,
          });
        }
      })
      .catch(() => {});

    fetch("/api/public/announcements?pinned=true&limit=3")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.success && data.data?.length > 0) {
          setPinnedAnnouncements(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const isOnPortal = pathname.startsWith("/aggregator/portal");

  return (
    <header className="sticky top-0 z-40 bg-agro-dark/95 backdrop-blur border-b border-slate-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/logo-light.svg" alt="Agro Hub" width={140} height={32} className="h-8 w-auto" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-4 h-10 flex items-center rounded-[8px] font-body text-sm transition-colors",
                pathname.startsWith(l.href)
                  ? "text-primary font-medium"
                  : "text-slate-300 hover:text-frost-white hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA / Avatar */}
        {aggregator ? (
          <Link
            href="/aggregator/portal"
            className="hidden md:flex items-center gap-2.5 h-10 pl-1.5 pr-4 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
          >
            {aggregator.profileImageUrl ? (
              <Image
                src={aggregator.profileImageUrl}
                alt={aggregator.name}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-display font-bold text-xs">
                  {aggregator.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-frost-white font-display font-semibold text-sm">
              {isOnPortal ? "My Portal" : aggregator.name.split(" ")[0]}
            </span>
          </Link>
        ) : (
          <Link
            href="/aggregator"
            className="hidden md:flex items-center h-10 px-5 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors glow-primary"
          >
            Become an Aggregator
          </Link>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-frost-white rounded-[8px] hover:bg-white/10 transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Announcement ticker */}
      {pinnedAnnouncements.length > 0 && !tickerDismissed && (
        <div className="bg-primary/10 border-b border-primary/20 relative">
          <div className="max-w-6xl mx-auto px-4 h-9 flex items-center">
            <Megaphone className="h-3.5 w-3.5 text-primary shrink-0 mr-2" />
            <div className="ticker-wrap flex-1">
              <div className="ticker-content">
                {[...pinnedAnnouncements, ...pinnedAnnouncements].map((a, i) => (
                  <Link
                    key={`${a.id}-${i}`}
                    href="/announcements"
                    className="text-xs text-primary font-medium mx-8 hover:underline"
                  >
                    {a.title}
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => setTickerDismissed(true)}
              className="shrink-0 ml-2 h-6 w-6 flex items-center justify-center rounded text-primary/60 hover:text-primary transition-colors"
              aria-label="Dismiss announcements"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-slate-border bg-agro-dark px-4 pb-4 pt-2 space-y-1 mobile-menu-enter">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center h-12 px-4 rounded-[8px] font-body text-base transition-colors",
                pathname.startsWith(l.href)
                  ? "text-primary font-medium bg-white/5"
                  : "text-slate-300 hover:text-frost-white hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}

          {aggregator ? (
            <Link
              href="/aggregator/portal"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 h-12 px-4 mt-2 rounded-[8px] bg-white/10 text-frost-white font-display font-semibold text-base"
            >
              {aggregator.profileImageUrl ? (
                <Image
                  src={aggregator.profileImageUrl}
                  alt={aggregator.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
              {aggregator.name.split(" ")[0]}&apos;s Portal
            </Link>
          ) : (
            <Link
              href="/aggregator"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center h-12 mt-2 rounded-[8px] bg-primary text-white font-display font-semibold text-base"
            >
              Become an Aggregator
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
