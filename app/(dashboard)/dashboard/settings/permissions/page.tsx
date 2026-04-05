import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PermissionsEditor } from "@/components/dashboard/permissions-editor";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import type { PermissionMatrix } from "@/types";

export default async function PermissionsPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const rows = await db.role.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const serialized = rows.map((r) => ({
    id: r.id,
    role: r.name,
    label: r.label,
    description: r.description,
    permissions: r.permissions as PermissionMatrix | null,
    isSystem: r.isSystem,
    color: r.color,
  }));

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-muted hover:text-agro-dark font-body text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[8px] bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-agro-dark">Roles & Permissions</h1>
            <p className="font-body text-sm text-muted mt-0.5">
              Create custom roles and configure what each role can access
            </p>
          </div>
        </div>
      </div>

      <PermissionsEditor initialData={serialized} />
    </div>
  );
}
