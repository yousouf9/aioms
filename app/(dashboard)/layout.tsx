import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { DashboardShell } from "@/components/dashboard/shell";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Check if user must reset password before accessing dashboard
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { mustResetPassword: true },
  });
  if (user?.mustResetPassword) redirect("/reset-password");

  const permissions = await getPermissionsForRole(session.role);
  const sessionWithPerms = { ...session, permissions };

  return <DashboardShell session={sessionWithPerms}>{children}</DashboardShell>;
}
