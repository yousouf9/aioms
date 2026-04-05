import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { ClockButton } from "./clock-button";
import { Users, Clock, UserCheck } from "lucide-react";

const timeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatTime(date: Date | string): string {
  return timeFormatter.format(new Date(date));
}

function getDuration(clockIn: Date, clockOut: Date | null): string {
  const end = clockOut ?? new Date();
  const ms = end.getTime() - new Date(clockIn).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  STAFF: "Staff",
};

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) return null;
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.attendance.view) redirect("/dashboard");

  const isStaff = session.role === "STAFF";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isStaff) {
    // ── STAFF view ────────────────────────────────────────────
    const since7Days = new Date();
    since7Days.setDate(since7Days.getDate() - 7);

    const [recentRecords, openToday, completedToday] = await Promise.all([
      db.attendance.findMany({
        where: {
          userId: session.id,
          clockIn: { gte: since7Days },
        },
        orderBy: { clockIn: "desc" },
      }),
      db.attendance.findFirst({
        where: {
          userId: session.id,
          clockIn: { gte: today, lt: tomorrow },
          clockOut: null,
        },
      }),
      db.attendance.findFirst({
        where: {
          userId: session.id,
          clockIn: { gte: today, lt: tomorrow },
          clockOut: { not: null },
        },
      }),
    ]);

    const isClockedIn = !!openToday;
    const hasCompletedToday = !!completedToday;

    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-agro-dark">My Attendance</h1>
          <p className="font-body text-sm text-muted mt-0.5">Track your clock-in and clock-out times</p>
        </div>

        {/* Current status card */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-body text-xs text-muted mb-1">Current Status</p>
              {isClockedIn ? (
                <>
                  <p className="font-display font-bold text-lg text-status-confirmed">
                    Clocked In
                  </p>
                  <p className="font-body text-xs text-muted mt-0.5">
                    Since {formatTime(openToday!.clockIn)} ·{" "}
                    {getDuration(openToday!.clockIn, null)} ago
                  </p>
                </>
              ) : (
                <p className="font-display font-bold text-lg text-muted">Not Clocked In</p>
              )}
            </div>
            <ClockButton isClockedIn={isClockedIn} hasCompletedToday={hasCompletedToday} />
          </div>
        </div>

        {/* Recent records */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-semibold text-agro-dark">Recent Activity (7 days)</h2>
          </div>
          {recentRecords.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-body text-sm text-muted">No attendance records found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentRecords.map((r) => (
                <li key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm font-medium text-agro-dark">
                      {new Date(r.clockIn).toLocaleDateString("en-NG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="font-body text-xs text-muted mt-0.5">
                      {formatTime(r.clockIn)}
                      {r.clockOut ? ` → ${formatTime(r.clockOut)}` : " → ongoing"}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.clockOut ? (
                      <>
                        <p className="font-body text-sm font-medium text-agro-dark">
                          {getDuration(r.clockIn, r.clockOut)}
                        </p>
                        <p className="font-body text-xs text-status-confirmed">Completed</p>
                      </>
                    ) : (
                      <p className="font-body text-xs text-status-pending">Ongoing</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── MANAGER / SUPER_ADMIN view ─────────────────────────────
  const [todayRecords, allStaff, myOpenRecord, myCompletedRecord] = await Promise.all([
    db.attendance.findMany({
      where: {
        clockIn: { gte: today, lt: tomorrow },
      },
      include: {
        user: { select: { id: true, name: true, roleName: true } },
      },
      orderBy: { clockIn: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, roleName: true },
      orderBy: { name: "asc" },
    }),
    db.attendance.findFirst({
      where: {
        userId: session.id,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
    }),
    db.attendance.findFirst({
      where: {
        userId: session.id,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: { not: null },
      },
    }),
  ]);

  const clockedInIds = new Set(
    todayRecords.filter((r) => r.clockOut === null).map((r) => r.userId)
  );
  const staffWithRecord = new Set(todayRecords.map((r) => r.userId));
  const notClockedIn = allStaff.filter((u) => !staffWithRecord.has(u.id));
  const currentlyIn = allStaff.filter((u) => clockedInIds.has(u.id));
  const myIsClockedIn = !!myOpenRecord;
  const myHasCompletedToday = !!myCompletedRecord;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Attendance</h1>
          <p className="font-body text-sm text-muted mt-0.5">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {/* Manager's own clock-in widget */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-body text-xs text-muted">You</p>
            <p className={`font-body text-xs font-medium ${myIsClockedIn ? "text-status-confirmed" : "text-muted"}`}>
              {myIsClockedIn ? `In since ${formatTime(myOpenRecord!.clockIn)}` : "Not clocked in"}
            </p>
          </div>
          <ClockButton isClockedIn={myIsClockedIn} hasCompletedToday={myHasCompletedToday} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-xs text-muted">Currently In</p>
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display font-bold text-2xl text-primary">{currentlyIn.length}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-xs text-muted">Total Today</p>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="font-display font-bold text-2xl text-agro-dark">{todayRecords.length}</p>
        </div>
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-xs text-muted">Not Checked In</p>
            <Users className="h-4 w-4 text-status-pending" />
          </div>
          <p className="font-display font-bold text-2xl text-status-pending">{notClockedIn.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's attendance records */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-semibold text-agro-dark">
              Today&apos;s Records
            </h2>
          </div>
          {todayRecords.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-body text-sm text-muted">No one has clocked in today.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {todayRecords.map((r) => (
                  <div key={r.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-body text-sm font-medium text-agro-dark">{r.user.name}</p>
                        <p className="font-body text-xs text-muted">
                          {ROLE_LABEL[r.user.roleName] ?? r.user.roleName}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-body font-medium px-2.5 py-1 rounded-[6px] ${
                          r.clockOut === null
                            ? "bg-green-50 text-status-confirmed"
                            : "bg-gray-100 text-muted"
                        }`}
                      >
                        {r.clockOut === null ? "In" : "Out"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs font-body text-muted">
                      <span>In: {formatTime(r.clockIn)}</span>
                      {r.clockOut && <span>Out: {formatTime(r.clockOut)}</span>}
                      {r.clockOut && <span>{getDuration(r.clockIn, r.clockOut)}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Staff", "Role", "Clock In", "Clock Out", "Duration"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 font-body text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-body text-sm font-medium text-agro-dark">
                          {r.user.name}
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-muted">
                          {ROLE_LABEL[r.user.roleName] ?? r.user.roleName}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-agro-dark whitespace-nowrap">
                          {formatTime(r.clockIn)}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-agro-dark whitespace-nowrap">
                          {r.clockOut ? formatTime(r.clockOut) : (
                            <span className="text-status-confirmed font-medium text-xs">Ongoing</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-muted whitespace-nowrap">
                          {getDuration(r.clockIn, r.clockOut)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Staff who haven't clocked in */}
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-semibold text-agro-dark">
              Not Clocked In Today
            </h2>
          </div>
          {notClockedIn.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-body text-sm text-muted">Everyone has clocked in today.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notClockedIn.map((u) => (
                <li key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm font-medium text-agro-dark">{u.name}</p>
                    <p className="font-body text-xs text-muted">
                      {ROLE_LABEL[u.roleName] ?? u.roleName}
                    </p>
                  </div>
                  <span className="text-xs font-body font-medium px-2.5 py-1 rounded-[6px] bg-amber-50 text-status-pending">
                    Absent
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
