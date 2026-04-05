import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { StaffTable } from "@/components/dashboard/staff-table";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.staff.view) redirect("/dashboard");

  const staffRaw = await db.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      roleName: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const staff = staffRaw.map((s) => ({ ...s, role: s.roleName }));

  // Fetch all roles for role selector dropdowns
  const roles = await db.role.findMany({
    orderBy: { sortOrder: "asc" },
    select: { name: true, label: true, isSystem: true, color: true },
  });

  return <StaffTable staff={staff} session={session} roles={roles} />;
}
