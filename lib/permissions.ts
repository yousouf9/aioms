import { db } from "@/lib/db";
import type { StaffSession, PermissionMatrix, PermissionResource, PermissionAction } from "@/types";
import { NextResponse } from "next/server";

// ─── Re-exports & constants ─────────────────────────────────────────────────

export type Resource = PermissionResource;
export type Action = PermissionAction;

export const RESOURCES: PermissionResource[] = [
  "orders", "sales", "payments", "inventory", "warehouses",
  "credit", "aggregators", "customers", "staff", "suppliers",
  "announcements", "reports", "settings", "attendance",
];

export const ACTIONS: PermissionAction[] = ["view", "create", "update", "delete"];

export const RESOURCE_LABELS: Record<PermissionResource, string> = {
  orders: "Orders",
  sales: "Sales / POS",
  payments: "Payments",
  inventory: "Inventory",
  warehouses: "Warehouses & Shops",
  credit: "Credit & Debt",
  aggregators: "Aggregators",
  customers: "Customers",
  staff: "Staff",
  suppliers: "Suppliers",
  announcements: "Announcements",
  reports: "Reports",
  settings: "Settings",
  attendance: "Attendance",
};

// Hardcoded fallback permissions for system roles — used when DB permissions are missing or incomplete
const SYSTEM_ROLE_DEFAULTS: Record<string, Partial<PermissionMatrix>> = {
  MANAGER: {
    orders: { view: true, create: true, update: true, delete: false },
    sales: { view: true, create: true, update: true, delete: false },
    payments: { view: true, create: true, update: true, delete: false },
    inventory: { view: true, create: true, update: true, delete: true },
    warehouses: { view: true, create: true, update: true, delete: true },
    credit: { view: true, create: true, update: true, delete: false },
    aggregators: { view: true, create: true, update: true, delete: false },
    customers: { view: true, create: true, update: true, delete: false },
    staff: { view: true, create: false, update: false, delete: false },
    suppliers: { view: true, create: true, update: true, delete: false },
    announcements: { view: true, create: true, update: true, delete: true },
    reports: { view: true, create: false, update: false, delete: false },
    settings: { view: true, create: false, update: true, delete: false },
    attendance: { view: true, create: true, update: false, delete: false },
  },
  CASHIER: {
    orders: { view: true, create: true, update: true, delete: false },
    sales: { view: true, create: true, update: false, delete: false },
    payments: { view: true, create: true, update: false, delete: false },
    inventory: { view: true, create: false, update: false, delete: false },
    warehouses: { view: true, create: false, update: false, delete: false },
    credit: { view: true, create: true, update: false, delete: false },
    aggregators: { view: false, create: false, update: false, delete: false },
    customers: { view: true, create: true, update: true, delete: false },
    staff: { view: false, create: false, update: false, delete: false },
    suppliers: { view: false, create: false, update: false, delete: false },
    announcements: { view: true, create: false, update: false, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false },
    attendance: { view: true, create: true, update: false, delete: false },
  },
};

// ─── In-memory cache (single-server, 60s TTL) ──────────────────────────────

const cache = new Map<string, { data: PermissionMatrix; fetchedAt: number }>();
const CACHE_TTL = 60_000;

export function invalidatePermissionCache(role?: string) {
  if (role) {
    cache.delete(role);
  } else {
    cache.clear();
  }
}

// ─── Core functions ─────────────────────────────────────────────────────────

function allTrue(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const r of RESOURCES) {
    matrix[r] = { view: true, create: true, update: true, delete: true };
  }
  return matrix;
}

function allFalse(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const r of RESOURCES) {
    matrix[r] = { view: false, create: false, update: false, delete: false };
  }
  return matrix;
}

export async function getPermissionsForRole(role: string): Promise<PermissionMatrix> {
  if (role === "SUPER_ADMIN") return allTrue();

  const cached = cache.get(role);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const row = await db.role.findUnique({ where: { name: role } });
  const defaults = SYSTEM_ROLE_DEFAULTS[role];

  if (!row || !row.permissions) {
    const fallback = defaults ? { ...allFalse(), ...defaults } as PermissionMatrix : allFalse();
    cache.set(role, { data: fallback, fetchedAt: Date.now() });
    return fallback;
  }

  // Deep-merge: defaults set the base per-resource, DB values override per-action.
  // This prevents a partial DB entry (e.g. settings.view=false) from silently locking
  // users out of resources the role is supposed to have access to.
  const dbPerms = row.permissions as PermissionMatrix;
  const data: PermissionMatrix = {} as PermissionMatrix;
  for (const r of RESOURCES) {
    const base = defaults?.[r] ?? { view: false, create: false, update: false, delete: false };
    data[r] = { ...base, ...(dbPerms[r] ?? {}) };
  }
  cache.set(role, { data, fetchedAt: Date.now() });
  return data;
}

export function checkPermission(
  permissions: PermissionMatrix,
  resource: Resource,
  action: Action,
): boolean {
  return permissions[resource]?.[action] ?? false;
}

export async function hasPermission(
  session: StaffSession,
  resource: Resource,
  action: Action,
): Promise<boolean> {
  if (session.role === "SUPER_ADMIN") return true;
  const perms = await getPermissionsForRole(session.role);
  return checkPermission(perms, resource, action);
}

export async function requirePermission(
  session: StaffSession | null,
  resource: Resource,
  action: Action,
): Promise<NextResponse | null> {
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const allowed = await hasPermission(session, resource, action);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action" },
      { status: 403 },
    );
  }
  return null;
}
