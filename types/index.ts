import type { OrderStatus, PaymentStatus, CreditStatus, OfferStatus } from "../app/generated/prisma/client";

export type { OrderStatus, PaymentStatus, CreditStatus, OfferStatus };

/** System role names — guaranteed to exist, used in hardcoded checks */
export type SystemRoleName = "SUPER_ADMIN" | "MANAGER" | "CASHIER";

export type PermissionAction = "view" | "create" | "update" | "delete";
export type PermissionResource =
  | "orders" | "sales" | "payments" | "inventory" | "warehouses"
  | "credit" | "aggregators" | "customers" | "staff"
  | "announcements" | "reports" | "settings" | "attendance";
export type PermissionMatrix = Record<PermissionResource, Record<PermissionAction, boolean>>;

export interface RoleRecord {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  permissions: PermissionMatrix | null;
  isSystem: boolean;
  color?: string | null;
  sortOrder: number;
}

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: PermissionMatrix;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  lowStockCount: number;
  overdueCredits: number;
  pendingTransfers: number;
  totalStockValue: number;
}
