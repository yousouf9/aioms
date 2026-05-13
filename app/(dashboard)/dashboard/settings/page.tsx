import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { EmailTest } from "@/components/dashboard/email-test";
import Link from "next/link";
import { Shield, ChevronRight, CheckCircle2, AlertCircle, Info } from "lucide-react";

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-[6px]">
      <CheckCircle2 className="h-3 w-3" /> Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-[6px]">
      <AlertCircle className="h-3 w-3" /> Not set
    </span>
  );
}

function EnvRow({ name, value, description }: { name: string; value: string | undefined; description: string }) {
  const isSet = !!value && value !== "";
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <code className="font-body text-xs font-semibold text-agro-dark">{name}</code>
        <p className="font-body text-xs text-muted mt-0.5">{description}</p>
      </div>
      <StatusBadge ok={isSet} />
    </div>
  );
}

function UrlBox({ label, url, note }: { label: string; url: string; note: string }) {
  return (
    <div>
      <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="bg-gray-50 border border-gray-200 rounded-[8px] px-3 py-2">
        <code className="font-body text-xs text-agro-dark break-all">{url}</code>
      </div>
      <p className="font-body text-xs text-muted mt-1">{note}</p>
    </div>
  );
}

function IntegrationInfo() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const webhookUrl = `${appUrl}/api/webhooks/valuepay`;
  const redirectUrl = `${appUrl}/payment/return`;

  const valuepayKey = process.env.VALUEPAY_PRIVATE_KEY;
  const valuepayEnc = process.env.VALUEPAY_ENCRYPTION_KEY;
  const zeptoToken = process.env.ZEPTOMAIL_TOKEN;
  const emailFrom = process.env.EMAIL_FROM;
  const emailFromName = process.env.EMAIL_FROM_NAME;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cloudPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const cloudKey = process.env.CLOUDINARY_API_KEY;
  const cloudSecret = process.env.CLOUDINARY_API_SECRET;
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP;
  const jwtSecret = process.env.JWT_SECRET;

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h2 className="font-display font-bold text-lg text-agro-dark mb-1">Integration Setup</h2>
        <p className="font-body text-sm text-muted">
          Status of all third-party service credentials. Missing items must be added to the server environment variables (
          <code className="text-xs">.env</code> file or hosting dashboard).
        </p>
      </div>

      {/* ── Valuepay ── */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-agro-dark">Valuepay — Payment Gateway</h3>
          <StatusBadge ok={!!valuepayKey && !!valuepayEnc} />
        </div>
        <p className="font-body text-xs text-muted mb-4">
          Used for online card payments, USSD, and bank transfers from customers. Keys are obtained from the
          Valuepay merchant dashboard → Settings → API Keys.
        </p>

        <div className="mb-4">
          <EnvRow name="VALUEPAY_PRIVATE_KEY" value={valuepayKey} description="Secret/private API key — used server-side to initiate payment transactions. Never expose to browser." />
          <EnvRow name="VALUEPAY_ENCRYPTION_KEY" value={valuepayEnc} description="Webhook signing key — used to verify that webhook events genuinely come from Valuepay." />
          <EnvRow name="VALUEPAY_BASE_URL" value={process.env.VALUEPAY_BASE_URL} description="API base URL. Default: https://valuepay.konplit.com/v1 — leave unchanged unless Valuepay advises otherwise." />
        </div>

        <p className="font-body text-xs font-semibold text-muted uppercase tracking-wide mb-3">Valuepay Dashboard Configuration</p>
        <div className="space-y-3">
          <UrlBox
            label="Webhook URL (paste into Valuepay → Settings → Webhooks)"
            url={webhookUrl}
            note="Valuepay POSTs here when a payment completes. Enable the transaction.completed event."
          />
          <UrlBox
            label="Payment Return / Redirect URL"
            url={redirectUrl}
            note="Customers land here after completing or abandoning payment."
          />
        </div>

        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2.5">
          <p className="font-body text-xs text-amber-800">
            <strong>Important:</strong> Valuepay cannot reach <code>localhost</code>. For local testing, use ngrok
            and set <code>NEXT_PUBLIC_APP_URL</code> to the tunnel URL.
          </p>
        </div>
      </div>

      {/* ── ZeptoMail ── */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-agro-dark">ZeptoMail — Transactional Email</h3>
          <StatusBadge ok={!!zeptoToken && !!emailFrom} />
        </div>
        <p className="font-body text-xs text-muted mb-4">
          Sends order confirmations, staff account emails, password resets, and aggregator notifications. Account
          created at{" "}
          <strong>transactional.zeptomail.com</strong>. Requires a verified sender domain (e.g.{" "}
          <code className="text-xs">nakowa.com.ng</code>).
        </p>

        <div className="mb-4">
          <EnvRow name="ZEPTOMAIL_TOKEN" value={zeptoToken} description="API token from ZeptoMail → Settings → API Tokens. Starts with 'wSsVR6...' or similar." />
          <EnvRow name="EMAIL_FROM" value={emailFrom} description="Verified sender email address — must match a domain verified in your ZeptoMail account (e.g. noreply@nakowa.com.ng)." />
          <EnvRow name="EMAIL_FROM_NAME" value={emailFromName} description='Display name shown in email clients (e.g. "Nakowa").' />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-[8px] px-3 py-2.5 flex gap-2">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="font-body text-xs text-blue-800 space-y-1">
            <p><strong>Domain verification steps (ZeptoMail dashboard):</strong></p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Go to ZeptoMail → Mail Agents → Add Domain</li>
              <li>Enter <code>nakowa.com.ng</code> and follow the DNS verification steps</li>
              <li>Add the provided SPF, DKIM, and DMARC records to your domain DNS</li>
              <li>Once verified, create a sending address (e.g. <code>noreply@nakowa.com.ng</code>)</li>
              <li>Generate an API token and paste it into <code>ZEPTOMAIL_TOKEN</code></li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Cloudinary ── */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-agro-dark">Cloudinary — Image Uploads</h3>
          <StatusBadge ok={!!cloudName && !!cloudPreset && !!cloudKey && !!cloudSecret} />
        </div>
        <p className="font-body text-xs text-muted mb-4">
          Used for uploading aggregator profile photos and supplier payment receipts. Free account supports up to
          25 GB storage. Account at <strong>cloudinary.com</strong>.
        </p>

        <div className="mb-4">
          <EnvRow name="NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" value={cloudName} description="Your Cloudinary cloud name — visible on the dashboard home page." />
          <EnvRow name="NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET" value={cloudPreset} description="Unsigned upload preset name — create under Settings → Upload → Upload Presets. Mode must be Unsigned." />
          <EnvRow name="CLOUDINARY_API_KEY" value={cloudKey} description="API key from Cloudinary → Settings → Access Keys. Used for server-side deletion." />
          <EnvRow name="CLOUDINARY_API_SECRET" value={cloudSecret} description="API secret — keep server-side only, never expose to browser." />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-[8px] px-3 py-2.5 flex gap-2">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="font-body text-xs text-blue-800">
            Create the upload preset under <strong>Settings → Upload → Upload Presets → Add upload preset</strong>.
            Set Signing Mode to <strong>Unsigned</strong> and note the preset name.
          </p>
        </div>
      </div>

      {/* ── App Config ── */}
      <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-agro-dark">App Configuration</h3>
          <StatusBadge ok={!!appUrl && appUrl !== "https://yourdomain.com" && !!whatsapp && !!jwtSecret} />
        </div>
        <p className="font-body text-xs text-muted mb-4">
          Core environment variables required for the app to function correctly in production.
        </p>
        <EnvRow name="NEXT_PUBLIC_APP_URL" value={process.env.NEXT_PUBLIC_APP_URL} description={`Base URL of this deployment — used to build Valuepay webhook and redirect URLs. Current: ${appUrl}`} />
        <EnvRow name="NEXT_PUBLIC_WHATSAPP" value={whatsapp} description="WhatsApp number in international format without +: digits only (e.g. 2348012345678). Used for customer contact buttons and email footers." />
        <EnvRow name="JWT_SECRET" value={jwtSecret && jwtSecret !== "change-this-to-a-strong-random-secret-before-production" ? jwtSecret : undefined} description="Secret key for signing staff session tokens. Must be a long random string — change before going live." />
        <EnvRow name="DATABASE_URL" value={process.env.DATABASE_URL} description="PostgreSQL connection string. Provided by your database host (Render, Supabase, etc.)." />
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
