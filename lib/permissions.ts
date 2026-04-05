import { db } from "@/lib/db";
import type { StaffSession, PermissionMatrix, PermissionResource, PermissionAction } from "@/types";
import { NextResponse } from "next/server";

// ─── Re-exports & constants ─────────────────────────────────────────────────

export type Resource = PermissionResource;
export type Action = PermissionAction;

export const RESOURCES: PermissionResource[] = [
  "orders", "sales", "payments", "inventory", "warehouses",
  "credit", "aggregators", "customers", "staff",
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
  announcements: "Announcements",
  reports: "Reports",
  settings: "Settings",
  attendance: "Attendance",
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
  if (!row || !row.permissions) {
    return allFalse();
  }

  const data = row.permissions as PermissionMatrix;
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
