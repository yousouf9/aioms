import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AnnouncementsManager } from "@/components/dashboard/announcements-manager";

const PAGE_SIZE = 20;

export default async function DashboardAnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.announcements.view) redirect("/dashboard");

  const [announcements, total] = await Promise.all([
    db.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: PAGE_SIZE,
    }),
    db.announcement.count(),
  ]);

  return (
    <AnnouncementsManager
      initialAnnouncements={announcements}
      initialTotal={total}
      pageSize={PAGE_SIZE}
    />
  );
}
