"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Package,
  Warehouse,
  History,
  Users,
  BarChart2,
  Settings,
  Clock,
  LogOut,
  X,
  Megaphone,
  ClipboardList,
  UserCheck,
  Handshake,
  ArrowRightLeft,
  Store,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavProgress } from "./nav-progress";
import type { StaffSession, PermissionResource } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: PermissionResource;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList, resource: "orders" },
  { href: "/dashboard/sales", label: "Sales / POS", icon: ShoppingCart, resource: "sales" },
  { href: "/dashboard/inventory", label: "Products", icon: Package, resource: "inventory" },
  { href: "/dashboard/warehouses", label: "Warehouses", icon: Warehouse, resource: "warehouses" },
  { href: "/dashboard/shops", label: "Shops", icon: Store, resource: "warehouses" },
  { href: "/dashboard/transfers", label: "Stock Transfers", icon: ArrowRightLeft, resource: "warehouses" },
  { href: "/dashboard/customers", label: "Customers", icon: UserCheck, resource: "customers" },
  { href: "/dashboard/credit", label: "Credit & Debt", icon: CreditCard, resource: "credit" },
  { href: "/dashboard/aggregators", label: "Aggregators", icon: Handshake, resource: "aggregators" },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck, resource: "suppliers" },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, resource: "payments" },
  { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone, resource: "announcements" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart2, resource: "reports" },
  { href: "/dashboard/audit-trail", label: "Audit Trail", icon: History, resource: "reports" },
  { href: "/dashboard/staff", label: "Staff", icon: Users, resource: "staff" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, resource: "settings" },
  { href: "/dashboard/attendance", label: "Attendance", icon: Clock, resource: "attendance" },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
};

interface SidebarProps {
  session: StaffSession;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ session, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const perms = session.permissions;
  const { pendingHref } = useNavProgress();

  const visibleItems = NAV_ITEMS.filter((item) =>
    !item.resource || perms?.[item.resource]?.view
  );

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const navContent = (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const pending = pendingHref === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 h-11 rounded-[8px] font-body text-sm transition-colors",
                    active || pending
                      ? "bg-primary text-white font-semibold"
                      : "text-slate-300 hover:text-frost-white hover:bg-white/5"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                  {pending && (
                    <span className="ml-auto h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-slate-border flex-shrink-0">
        <div className="px-3 py-2 mb-1">
          <p className="font-body text-sm font-medium text-frost-white truncate">
            {session.name}
          </p>
          <p className="font-body text-xs text-muted truncate">
            {ROLE_LABELS[session.role] ?? session.role}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 h-11 w-full rounded-[8px] text-muted hover:text-red-400 hover:bg-white/5 transition-colors font-body text-sm"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] flex-shrink-0 flex-col bg-slate-mid border-r border-slate-border h-full">
        <div className="h-16 flex items-center px-6 border-b border-slate-border flex-shrink-0">
          <Image src="/logo-light.svg" alt="Nakowa" width={120} height={28} className="h-7 w-auto" />
        </div>
        {navContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-agro-dark/60"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] flex flex-col bg-slate-mid border-r border-slate-border">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-border flex-shrink-0">
              <Image src="/logo-light.svg" alt="Nakowa" width={120} height={28} className="h-7 w-auto" />
              <button
                onClick={onClose}
                className="p-1 text-muted hover:text-frost-white transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
