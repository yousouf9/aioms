import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { EmailTest } from "@/components/dashboard/email-test";
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";

function IntegrationInfo() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const webhookUrl = `${appUrl}/api/webhooks/valuepay`;
  const redirectUrl = `${appUrl}/payment/return`;

  return (
    <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-6">
      <h2 className="font-display font-semibold text-agro-dark mb-1">Payment Gateway Integration</h2>
      <p className="font-body text-xs text-muted mb-4">
        Add these URLs to your Valuepay merchant dashboard under Settings → Webhooks / Redirect.
      </p>

      <div className="space-y-3">
        <div>
          <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-1">Webhook URL</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2">
            <code className="font-body text-xs text-agro-dark flex-1 break-all">{webhookUrl}</code>
          </div>
          <p className="font-body text-xs text-muted mt-1">
            Valuepay will POST to this URL when a payment is completed. Enable the <strong>transaction.completed</strong> event.
          </p>
        </div>

        <div>
          <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-1">Payment Return / Redirect URL</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2">
            <code className="font-body text-xs text-agro-dark flex-1 break-all">{redirectUrl}</code>
          </div>
          <p className="font-body text-xs text-muted mt-1">
            Customers land here after completing (or abandoning) payment. This is also sent per-transaction in the API call.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2.5">
          <p className="font-body text-xs text-amber-800">
            <strong>Local development:</strong> Valuepay cannot reach <code>localhost</code>. Use{" "}
            <strong>ngrok</strong> or a similar tunnel and update <code>NEXT_PUBLIC_APP_URL</code> in your{" "}
            <code>.env</code> file to the tunnel URL while testing.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard");
  const permissions = await getPermissionsForRole(session.role);
  if (!permissions.settings.view) redirect("/dashboard");

  const settings = await db.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  // Serialize Prisma Decimal → number
  const serializedSettings = {
    ...settings,
    deliveryFee: settings.deliveryFee?.toNumber() ?? 0,
    deliveryAreas: Array.isArray(settings.deliveryAreas) ? settings.deliveryAreas as string[] : [],
    openingHours: settings.openingHours ?? null,
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-agro-dark">Settings</h1>
        <p className="font-body text-sm text-muted mt-0.5">Manage business information and system settings</p>
      </div>
      {/* Roles & Permissions link */}
      <Link
        href="/dashboard/settings/permissions"
        className="flex items-center justify-between bg-white rounded-[12px] border border-gray-200 shadow-card p-5 mb-6 hover:border-primary/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[8px] bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-agro-dark">Roles & Permissions</p>
            <p className="font-body text-xs text-muted mt-0.5">Configure what each role can access and do</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
      </Link>

      <IntegrationInfo />
      <EmailTest />
      <SettingsForm settings={serializedSettings} />
    </div>
  );
}
