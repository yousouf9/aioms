"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Check, X, Save, RotateCcw, Plus, Trash2, Loader2 } from "lucide-react";
import type { PermissionMatrix, PermissionResource, PermissionAction } from "@/types";

const RESOURCES: PermissionResource[] = [
  "orders", "sales", "payments", "inventory", "warehouses",
  "credit", "aggregators", "customers", "staff",
  "announcements", "reports", "settings", "attendance",
];

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  orders: "Orders",
  sales: "Sales / POS",
  payments: "Payments",
  inventory: "Inventory",
  warehouses: "Warehouses",
  credit: "Credit Sales",
  aggregators: "Aggregators",
  customers: "Customers",
  staff: "Staff",
  announcements: "Announcements",
  reports: "Reports",
  settings: "Settings",
  attendance: "Attendance",
};

const ACTIONS: PermissionAction[] = ["view", "create", "update", "delete"];

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

type RoleRow = {
  id: string;
  role: string;
  label: string;
  description?: string | null;
  permissions: PermissionMatrix | null;
  isSystem: boolean;
  color?: string | null;
};

function allFalse(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const r of RESOURCES) {
    matrix[r] = { view: false, create: false, update: false, delete: false };
  }
  return matrix;
}

export function PermissionsEditor({
  initialData,
}: {
  initialData: RoleRow[];
}) {
  const router = useRouter();
  // Only show editable roles (not SUPER_ADMIN)
  const [roles, setRoles] = useState<RoleRow[]>(initialData.filter((r) => r.role !== "SUPER_ADMIN"));
  const [activeRole, setActiveRole] = useState(roles[0]?.role ?? "");
  const [permissions, setPermissions] = useState<Record<string, PermissionMatrix>>(() => {
    const map: Record<string, PermissionMatrix> = {};
    for (const row of roles) {
      map[row.role] = row.permissions ?? allFalse();
    }
    return map;
  });
  const [originalPermissions] = useState<Record<string, PermissionMatrix>>(() => {
    const map: Record<string, PermissionMatrix> = {};
    for (const row of roles) {
      map[row.role] = JSON.parse(JSON.stringify(row.permissions ?? allFalse()));
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeRoleData = roles.find((r) => r.role === activeRole);
  const currentPerms = permissions[activeRole];

  function toggle(resource: PermissionResource, action: PermissionAction) {
    setPermissions((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [resource]: {
          ...prev[activeRole][resource],
          [action]: !prev[activeRole][resource][action],
        },
      },
    }));
    setFeedback(null);
  }

  function toggleAllForResource(resource: PermissionResource) {
    const allOn = ACTIONS.every((a) => currentPerms[resource][a]);
    setPermissions((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [resource]: {
          view: !allOn,
          create: !allOn,
          update: !allOn,
          delete: !allOn,
        },
      },
    }));
    setFeedback(null);
  }

  function resetRole() {
    if (originalPermissions[activeRole]) {
      setPermissions((prev) => ({
        ...prev,
        [activeRole]: JSON.parse(JSON.stringify(originalPermissions[activeRole])),
      }));
      setFeedback(null);
    }
  }

  const hasChanges = currentPerms && originalPermissions[activeRole]
    ? JSON.stringify(currentPerms) !== JSON.stringify(originalPermissions[activeRole])
    : false;

  async function saveRole() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/dashboard/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: activeRole,
          permissions: permissions[activeRole],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Failed to save" });
        return;
      }
      setFeedback({ type: "success", msg: `${activeRoleData?.label ?? activeRole} permissions saved` });
      router.refresh();
    } catch {
      setFeedback({ type: "error", msg: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole() {
    if (!activeRoleData || activeRoleData.isSystem) return;
    if (!confirm(`Delete the "${activeRoleData.label}" role? This cannot be undone.`)) return;

    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/dashboard/roles/${activeRoleData.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Failed to delete" });
        return;
      }
      // Remove from local state
      const remaining = roles.filter((r) => r.role !== activeRole);
      setRoles(remaining);
      setActiveRole(remaining[0]?.role ?? "");
      setFeedback({ type: "success", msg: `Role "${activeRoleData.label}" deleted` });
      router.refresh();
    } catch {
      setFeedback({ type: "error", msg: "Something went wrong" });
    } finally {
      setDeleting(false);
    }
  }

  function handleRoleCreated(newRole: RoleRow) {
    setRoles((prev) => [...prev, newRole]);
    setPermissions((prev) => ({ ...prev, [newRole.role]: newRole.permissions ?? allFalse() }));
    originalPermissions[newRole.role] = JSON.parse(JSON.stringify(newRole.permissions ?? allFalse()));
    setActiveRole(newRole.role);
    setShowCreateModal(false);
    setFeedback({ type: "success", msg: `Role "${newRole.label}" created` });
    router.refresh();
  }

  if (roles.length === 0 && !showCreateModal) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-muted mb-4">No editable roles found.</p>
        <button onClick={() => setShowCreateModal(true)} className="h-11 px-5 bg-primary text-agro-dark font-display font-semibold text-sm rounded-[8px]">
          <Plus className="h-4 w-4 inline mr-1.5" /> Create Role
        </button>
        {showCreateModal && <CreateRoleModal onClose={() => setShowCreateModal(false)} onCreated={handleRoleCreated} />}
      </div>
    );
  }

  return (
    <div>
      {/* Role tabs + Create button */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {roles.map((row) => (
          <button
            key={row.role}
            onClick={() => { setActiveRole(row.role); setFeedback(null); }}
            className={`h-11 px-5 rounded-[8px] font-display font-semibold text-sm transition-colors ${
              activeRole === row.role
                ? "bg-primary text-agro-dark"
                : "border border-gray-200 text-muted hover:bg-gray-50"
            }`}
          >
            {row.label}
            {!row.isSystem && (
              <span className="ml-1.5 text-xs opacity-60">*</span>
            )}
          </button>
        ))}
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-11 px-4 rounded-[8px] border border-dashed border-gray-300 text-muted hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 font-body text-sm"
        >
          <Plus className="h-4 w-4" />
          New Role
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 rounded-[8px] px-4 py-2.5 text-sm font-body ${
          feedback.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-600"
        }`}>
          {feedback.msg}
        </div>
      )}

      {/* SUPER_ADMIN note */}
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-[8px] px-4 py-2.5">
        <p className="font-body text-xs text-amber-700">
          <strong>Super Admin</strong> always has full access to everything. This cannot be changed.
          {activeRoleData && !activeRoleData.isSystem && (
            <span className="ml-1"> Custom roles are marked with <strong>*</strong>.</span>
          )}
        </p>
      </div>

      {/* Role description for custom roles */}
      {activeRoleData && !activeRoleData.isSystem && activeRoleData.description && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-[8px] px-4 py-2.5">
          <p className="font-body text-xs text-blue-700">
            <strong>{activeRoleData.label}</strong>: {activeRoleData.description}
          </p>
        </div>
      )}

      {currentPerms && (
        <>
          {/* Permission matrix — desktop table */}
          <div className="hidden md:block bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide">
                      Resource
                    </th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="text-center px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide w-24">
                        {ACTION_LABELS[a]}
                      </th>
                    ))}
                    <th className="text-center px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide w-20">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resource) => {
                    const allOn = ACTIONS.every((a) => currentPerms?.[resource]?.[a]);
                    return (
                      <tr key={resource} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-muted" />
                            <span className="font-body text-sm text-agro-dark">{RESOURCE_LABELS[resource]}</span>
                          </div>
                        </td>
                        {ACTIONS.map((action) => (
                          <td key={action} className="text-center px-4 py-3">
                            <button
                              onClick={() => toggle(resource, action)}
                              className={`h-8 w-8 mx-auto rounded-[6px] flex items-center justify-center transition-colors ${
                                currentPerms?.[resource]?.[action]
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-gray-100 text-gray-300 border border-gray-200"
                              }`}
                            >
                              {currentPerms?.[resource]?.[action] ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        ))}
                        <td className="text-center px-4 py-3">
                          <button
                            onClick={() => toggleAllForResource(resource)}
                            className={`h-8 px-2.5 rounded-[6px] font-body text-xs transition-colors ${
                              allOn
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-gray-100 text-muted border border-gray-200 hover:bg-gray-200"
                            }`}
                          >
                            {allOn ? "All" : "None"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Permission matrix — mobile cards */}
          <div className="md:hidden space-y-3">
            {RESOURCES.map((resource) => (
              <div key={resource} className="bg-white rounded-[12px] border border-gray-200 shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-3.5 w-3.5 text-muted" />
                  <span className="font-body text-sm font-medium text-agro-dark">{RESOURCE_LABELS[resource]}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => toggle(resource, action)}
                      className={`h-11 rounded-[8px] flex flex-col items-center justify-center gap-0.5 transition-colors text-xs font-body ${
                        currentPerms?.[resource]?.[action]
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-gray-50 text-muted border border-gray-200"
                      }`}
                    >
                      {currentPerms?.[resource]?.[action] ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mt-6">
        <button
          onClick={saveRole}
          disabled={saving || !hasChanges}
          className="h-11 px-5 flex items-center gap-2 bg-primary text-agro-dark font-display font-semibold text-sm rounded-[8px] hover:bg-primary/90 transition-colors glow-emerald disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={resetRole}
          disabled={!hasChanges}
          className="h-11 px-4 flex items-center gap-2 border border-gray-200 text-muted font-body text-sm rounded-[8px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
        {activeRoleData && !activeRoleData.isSystem && (
          <button
            onClick={deleteRole}
            disabled={deleting}
            className="h-11 px-4 flex items-center gap-2 border border-red-200 text-status-cancelled font-body text-sm rounded-[8px] hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {deleting ? "Deleting…" : "Delete Role"}
          </button>
        )}
      </div>

      {showCreateModal && (
        <CreateRoleModal onClose={() => setShowCreateModal(false)} onCreated={handleRoleCreated} />
      )}
    </div>
  );
}

// ─── Create Role Modal ─────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { label: "Gray", value: "bg-gray-100 text-gray-600" },
  { label: "Blue", value: "bg-blue-50 text-blue-600" },
  { label: "Purple", value: "bg-purple-50 text-purple-600" },
  { label: "Emerald", value: "bg-primary-50 text-primary-600" },
  { label: "Amber", value: "bg-amber-50 text-amber-600" },
  { label: "Red", value: "bg-red-50 text-red-600" },
  { label: "Indigo", value: "bg-indigo-50 text-indigo-600" },
  { label: "Pink", value: "bg-pink-50 text-pink-600" },
];

function CreateRoleModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (role: RoleRow) => void;
}) {
  const [form, setForm] = useState({ name: "", label: "", description: "", color: "bg-gray-100 text-gray-600" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.label.trim()) {
      setError("Name and label are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create role");
        return;
      }
      onCreated({
        id: data.data.id,
        role: data.data.name,
        label: data.data.label,
        description: data.data.description,
        permissions: data.data.permissions,
        isSystem: false,
        color: data.data.color,
      });
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
          <h2 className="font-display font-bold text-lg text-agro-dark">Create Role</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Role Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. SUPERVISOR"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors uppercase"
            />
            <p className="font-body text-xs text-muted mt-1">Uppercase letters, numbers, and underscores only</p>
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Display Label *</label>
            <input
              required
              type="text"
              placeholder="e.g. Supervisor"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Description</label>
            <input
              type="text"
              placeholder="What this role is for"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Badge Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  className={`h-9 px-3 rounded-[6px] text-xs font-body font-medium transition-all ${c.value} ${
                    form.color === c.value ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-[8px] px-3 py-2.5">
            <p className="font-body text-xs text-blue-700">
              The role will be created with no permissions. You can configure permissions after creation.
            </p>
          </div>
          {error && <p className="text-status-cancelled text-sm font-body">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Creating…" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
