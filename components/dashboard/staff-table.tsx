"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCheck, UserX, Edit2, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionMenu, ActionMenuItem } from "./action-menu";
import type { StaffSession } from "@/types";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface RoleOption {
  name: string;
  label: string;
  isSystem: boolean;
  color?: string | null;
}

interface Props {
  staff: StaffMember[];
  session: StaffSession;
  roles: RoleOption[];
}

// Fallback labels/styles for system roles (used when role not in roles list)
const SYSTEM_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  STAFF: "Staff",
};

const SYSTEM_ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-50 text-purple-600",
  MANAGER: "bg-blue-50 text-blue-600",
  CASHIER: "bg-primary/10 text-primary",
  STAFF: "bg-gray-100 text-muted",
};

function getRoleLabel(roleName: string, roles: RoleOption[]): string {
  const found = roles.find((r) => r.name === roleName);
  return found?.label ?? SYSTEM_ROLE_LABELS[roleName] ?? roleName;
}

function getRoleStyle(roleName: string, roles: RoleOption[]): string {
  const found = roles.find((r) => r.name === roleName);
  return found?.color ?? SYSTEM_ROLE_STYLES[roleName] ?? "bg-gray-100 text-muted";
}

export function StaffTable({ staff, session, roles }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Staff</h1>
          <p className="font-body text-sm text-muted mt-0.5">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm hover:bg-primary/90 transition-colors glow-emerald"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-12 text-center">
          <p className="font-body text-muted">No staff members yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {staff.map((s) => (
              <div key={s.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-body font-semibold text-agro-dark truncate">{s.name}</p>
                      {!s.isActive && (
                        <span className="text-xs px-1.5 py-0.5 rounded-[4px] bg-red-50 text-status-cancelled">Inactive</span>
                      )}
                    </div>
                    <p className="font-body text-xs text-muted truncate">{s.email}</p>
                    <span className={`mt-1.5 inline-block text-xs font-body font-medium px-2 py-0.5 rounded-[6px] ${getRoleStyle(s.role, roles)}`}>
                      {getRoleLabel(s.role, roles)}
                    </span>
                  </div>
                  <StaffActions staff={s} session={session} onEdit={() => setEditStaff(s)} onRefresh={() => router.refresh()} />
                </div>
                {s.lastLoginAt && (
                  <p className="font-body text-xs text-muted mt-2">
                    Last login: {new Date(s.lastLoginAt).toLocaleDateString("en-NG")}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Name", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-body text-sm font-medium text-agro-dark">{s.name}</td>
                    <td className="px-4 py-3 font-body text-sm text-muted">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-[6px] ${getRoleStyle(s.role, roles)}`}>
                        {getRoleLabel(s.role, roles)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-[6px] ${s.isActive ? "bg-green-50 text-status-confirmed" : "bg-red-50 text-status-cancelled"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-muted">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString("en-NG") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <StaffActions staff={s} session={session} onEdit={() => setEditStaff(s)} onRefresh={() => router.refresh()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAdd && (
        <AddStaffModal session={session} roles={roles} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); router.refresh(); }} />
      )}
      {editStaff && (
        <EditStaffModal staff={editStaff} session={session} roles={roles} onClose={() => setEditStaff(null)} onSaved={() => { setEditStaff(null); router.refresh(); }} />
      )}
    </div>
  );
}

function StaffActions({ staff, session, onEdit, onRefresh }: {
  staff: StaffMember;
  session: StaffSession;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // Can't edit yourself, and managers can't edit other managers/super admins
  const canEdit = staff.id !== session.id &&
    !(["SUPER_ADMIN", "MANAGER"].includes(staff.role) && session.role !== "SUPER_ADMIN");

  if (!canEdit) return null;

  async function patch(data: Record<string, unknown>) {
    setLoading(true);
    try {
      await fetch(`/api/dashboard/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      onRefresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ActionMenu disabled={loading}>
      {(close) => (
        <>
          <ActionMenuItem onClick={() => { onEdit(); close(); }} icon={<Edit2 className="h-4 w-4 text-muted" />} label="Edit" />
          <ActionMenuItem
            onClick={() => { patch({ isActive: !staff.isActive }); close(); }}
            icon={staff.isActive ? <UserX className="h-4 w-4 text-status-cancelled" /> : <UserCheck className="h-4 w-4 text-status-confirmed" />}
            label={staff.isActive ? "Deactivate" : "Activate"}
          />
        </>
      )}
    </ActionMenu>
  );
}

function getAvailableRoles(session: StaffSession, roles: RoleOption[]): RoleOption[] {
  if (session.role === "SUPER_ADMIN") {
    return roles; // can assign any role
  }
  // Non-super-admins can only assign roles that aren't SUPER_ADMIN or MANAGER
  return roles.filter((r) => !["SUPER_ADMIN", "MANAGER"].includes(r.name));
}

function AddStaffModal({ session, roles, onClose, onSaved }: {
  session: StaffSession;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const availableRoles = getAvailableRoles(session, roles);
  const [form, setForm] = useState({ name: "", email: "", role: availableRoles.find((r) => r.name === "STAFF")?.name ?? availableRoles[0]?.name ?? "STAFF" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => onSaved(), 2000);
      }
      else setError(data.error ?? "Failed to create");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-sm bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Add Staff Member</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>

        {success ? (
          <div className="p-5 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <p className="font-display font-semibold text-agro-dark mb-1">Staff member created!</p>
            <p className="font-body text-sm text-muted">
              A welcome email with login credentials has been sent to <strong>{form.email}</strong>. They will be required to set a new password on first login.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-3">
            <div>
              <label className="block font-body text-xs text-muted mb-1">Full Name *</label>
              <input required type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block font-body text-xs text-muted mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors">
                {availableRoles.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-[8px] px-3 py-2.5">
              <p className="font-body text-xs text-blue-700">
                A temporary password will be generated and sent to their email. They must change it on first login.
              </p>
            </div>
            {error && <p className="text-status-cancelled text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm disabled:opacity-60">
                {saving ? "Creating…" : "Add Staff"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditStaffModal({ staff, session, roles, onClose, onSaved }: {
  staff: StaffMember;
  session: StaffSession;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const availableRoles = getAvailableRoles(session, roles);
  const [form, setForm] = useState({ name: staff.name, role: staff.role });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, role: form.role }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm(`Send a new temporary password to ${staff.email}? They will be required to change it on next login.`)) return;
    setResetting(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      const data = await res.json();
      if (data.success) setResetDone(true);
      else setError(data.error ?? "Failed to reset password");
    } catch {
      setError("Connection error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-sm bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">Edit {staff.name}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors">
              {availableRoles.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
            </select>
          </div>
          <div className="border border-gray-200 rounded-[8px] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm text-agro-dark font-medium">Password</p>
                <p className="font-body text-xs text-muted mt-0.5">Send a new temporary password via email</p>
              </div>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting || resetDone}
                className="h-9 px-3 rounded-[6px] border border-gray-200 font-body text-xs text-agro-dark hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Key className="h-3.5 w-3.5" />
                {resetting ? "Sending…" : resetDone ? "Sent ✓" : "Reset"}
              </button>
            </div>
            {resetDone && (
              <p className="font-body text-xs text-primary mt-2">
                Temporary password sent to {staff.email}. They must change it on next login.
              </p>
            )}
          </div>
          {error && <p className="text-status-cancelled text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
