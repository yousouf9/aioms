const ZEPTO_TOKEN = process.env.ZEPTOMAIL_TOKEN ?? "";
const ZEPTO_URL = "https://api.zeptomail.com/v1.1/email";
const FROM_EMAIL = process.env.EMAIL_FROM ?? "noreply@agrohub.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Agro Hub";
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP ?? "";

type SendEmailParams = {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
};

async function sendEmail(params: SendEmailParams) {
  if (!ZEPTO_TOKEN) {
    console.warn("[EMAIL] ZEPTOMAIL_TOKEN not set — skipping email");
    return;
  }

  try {
    const res = await fetch(ZEPTO_URL, {
      method: "POST",
      headers: {
        Authorization: `Zoho-enczapikey ${ZEPTO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { address: FROM_EMAIL, name: FROM_NAME },
        to: [{ email_address: { address: params.to, name: params.toName } }],
        subject: params.subject,
        htmlbody: params.htmlBody,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[EMAIL] ZeptoMail error:", res.status, text);
    }
  } catch (err) {
    console.error("[EMAIL] Send failed:", err);
  }
}

function layout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1B2631;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:16px 0;border-bottom:1px solid #2C3E50;">
      <span style="font-size:24px;font-weight:bold;letter-spacing:2px;">
        <span style="color:#43A047;">Agro</span><span style="color:#FAFAFA;"> Hub</span>
      </span>
    </div>
    <!-- Content -->
    <div style="padding:24px 0;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="border-top:1px solid #2C3E50;padding:16px 0;text-align:center;">
      <p style="color:#95A5A6;font-size:12px;margin:0;">Agro Hub — Your Trusted Agricultural Supplies Partner</p>
      ${WHATSAPP ? `<p style="margin:8px 0 0;"><a href="https://wa.me/${WHATSAPP}" style="color:#43A047;font-size:12px;text-decoration:none;">Chat with us on WhatsApp</a></p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

// ── Staff Welcome Email ──
export async function sendStaffWelcomeEmail(params: {
  to: string;
  staffName: string;
  tempPassword: string;
  role: string;
  loginUrl: string;
}) {
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    MANAGER: "Manager",
    CASHIER: "Cashier",
  };
  const roleLabel = roleLabels[params.role] ?? params.role;

  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">Welcome to Agro Hub!</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Your staff account has been created. Here are your login details:</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#95A5A6;font-size:12px;padding:8px 0;">Name</td><td style="color:#FAFAFA;font-size:14px;text-align:right;padding:8px 0;">${params.staffName}</td></tr>
        <tr><td style="color:#95A5A6;font-size:12px;padding:8px 0;">Email</td><td style="color:#FAFAFA;font-size:14px;text-align:right;padding:8px 0;">${params.to}</td></tr>
        <tr><td style="color:#95A5A6;font-size:12px;padding:8px 0;">Role</td><td style="color:#43A047;font-size:14px;font-weight:bold;text-align:right;padding:8px 0;">${roleLabel}</td></tr>
        <tr><td style="color:#95A5A6;font-size:12px;padding:8px 0;">Temporary Password</td><td style="color:#FAFAFA;font-size:16px;font-weight:bold;text-align:right;padding:8px 0;letter-spacing:2px;">${params.tempPassword}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.loginUrl}" style="display:inline-block;background:#43A047;color:#FAFAFA;font-size:14px;font-weight:bold;padding:12px 32px;border-radius:8px;text-decoration:none;">Login Now</a>
    </div>
    <div style="background:#212F3D;border:1px solid #FF8F00;border-radius:8px;padding:12px 16px;margin-top:8px;">
      <p style="color:#FF8F00;font-size:12px;margin:0;font-weight:bold;">Important</p>
      <p style="color:#95A5A6;font-size:12px;margin:4px 0 0;">You will be required to change your password on first login. Do not share your credentials with anyone.</p>
    </div>
  `);

  await sendEmail({
    to: params.to,
    toName: params.staffName,
    subject: "Your Agro Hub Staff Account",
    htmlBody: html,
  });
}

// ── Password Reset by Admin Email ──
export async function sendPasswordResetEmail(params: {
  to: string;
  staffName: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">Password Reset</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Your password has been reset by an administrator. Use the temporary password below to log in.</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:20px;text-align:center;">
      <p style="color:#95A5A6;font-size:12px;margin:0 0 4px;">Temporary Password</p>
      <p style="color:#FAFAFA;font-size:24px;font-weight:bold;letter-spacing:3px;margin:0;">${params.tempPassword}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.loginUrl}" style="display:inline-block;background:#43A047;color:#FAFAFA;font-size:14px;font-weight:bold;padding:12px 32px;border-radius:8px;text-decoration:none;">Login Now</a>
    </div>
    <p style="color:#95A5A6;font-size:12px;margin:0;text-align:center;">You will be required to set a new password on login.</p>
  `);

  await sendEmail({
    to: params.to,
    toName: params.staffName,
    subject: "Password Reset — Agro Hub",
    htmlBody: html,
  });
}

// ── Order Confirmation Email ──
export async function sendOrderConfirmation(params: {
  to: string;
  customerName: string;
  orderCode: string;
  items: { name: string; quantity: number; total: string }[];
  subtotal: string;
  deliveryFee: string;
  total: string;
  deliveryMethod: string;
}) {
  const itemRows = params.items
    .map(
      (item) =>
        `<tr><td style="color:#FAFAFA;font-size:12px;padding:6px 0;">${item.name} x${item.quantity}</td><td style="color:#FAFAFA;font-size:12px;text-align:right;padding:6px 0;">${item.total}</td></tr>`
    )
    .join("");

  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">Order Placed!</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Thank you for your order. We'll process it shortly.</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:20px;">
      <div style="text-align:center;margin-bottom:16px;">
        <p style="color:#95A5A6;font-size:12px;margin:0 0 4px;">Order Code</p>
        <p style="color:#43A047;font-size:28px;font-weight:bold;letter-spacing:4px;margin:0;">${params.orderCode}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#95A5A6;font-size:12px;padding:6px 0;">Customer</td><td style="color:#FAFAFA;font-size:12px;text-align:right;padding:6px 0;">${params.customerName}</td></tr>
        <tr><td style="color:#95A5A6;font-size:12px;padding:6px 0;">Delivery</td><td style="color:#FAFAFA;font-size:12px;text-align:right;padding:6px 0;">${params.deliveryMethod}</td></tr>
      </table>
      <div style="border-top:1px solid #2C3E50;margin:12px 0;"></div>
      <table style="width:100%;border-collapse:collapse;">
        ${itemRows}
        <tr><td colspan="2" style="border-top:1px solid #2C3E50;padding:0;"></td></tr>
        <tr><td style="color:#95A5A6;font-size:12px;padding:6px 0;">Subtotal</td><td style="color:#FAFAFA;font-size:12px;text-align:right;padding:6px 0;">${params.subtotal}</td></tr>
        <tr><td style="color:#95A5A6;font-size:12px;padding:6px 0;">Delivery Fee</td><td style="color:#FAFAFA;font-size:12px;text-align:right;padding:6px 0;">${params.deliveryFee}</td></tr>
        <tr><td style="color:#43A047;font-size:14px;font-weight:bold;padding:8px 0;">Total</td><td style="color:#43A047;font-size:14px;font-weight:bold;text-align:right;padding:8px 0;">${params.total}</td></tr>
      </table>
    </div>
    <p style="color:#95A5A6;font-size:13px;margin:20px 0 0;text-align:center;">Use your order code to track your order status.</p>
  `);

  await sendEmail({
    to: params.to,
    toName: params.customerName,
    subject: `Order Confirmed — ${params.orderCode}`,
    htmlBody: html,
  });
}

// ── Aggregator Email Verification ──
export async function sendAggregatorVerifyEmail(params: {
  to: string;
  name: string;
  code: string;
}) {
  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">Verify Your Email</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Hi ${params.name}, enter the code below to verify your Agro Hub aggregator account.</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:24px;text-align:center;">
      <p style="color:#95A5A6;font-size:12px;margin:0 0 8px;">Your Verification Code</p>
      <p style="color:#43A047;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;">${params.code}</p>
    </div>
    <p style="color:#95A5A6;font-size:12px;margin:20px 0 0;text-align:center;">This code expires in 30 minutes.</p>
  `);

  await sendEmail({
    to: params.to,
    toName: params.name,
    subject: "Verify Your Email — Agro Hub",
    htmlBody: html,
  });
}

// ── Aggregator Password Reset Email ──
export async function sendAggregatorPasswordReset(params: {
  to: string;
  name: string;
  resetCode: string;
}) {
  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">Password Reset Code</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Hi ${params.name}, use the code below to reset your Agro Hub aggregator account password.</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:24px;text-align:center;">
      <p style="color:#95A5A6;font-size:12px;margin:0 0 8px;">Your Reset Code</p>
      <p style="color:#43A047;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;">${params.resetCode}</p>
    </div>
    <p style="color:#95A5A6;font-size:12px;margin:20px 0 0;text-align:center;">This code expires in 15 minutes. If you didn't request this, please ignore this email.</p>
  `);

  await sendEmail({
    to: params.to,
    toName: params.name,
    subject: "Password Reset Code — Agro Hub",
    htmlBody: html,
  });
}

// ── Aggregator Offer Update Email ──
export type AggregatorOfferEvent =
  | "COUNTER"
  | "ACCEPT"
  | "REJECT"
  | "SEND_AGREEMENT"
  | "APPROVE_AGREEMENT"
  | "REJECT_AGREEMENT"
  | "ADVANCE"
  | "DELIVERY"
  | "PAYMENT"
  | "COMPLETED";

export async function sendAggregatorOfferUpdate(params: {
  to: string;
  name: string;
  event: AggregatorOfferEvent;
  offerId: string;
  productName: string;
  details?: string;
}) {
  const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/aggregator/portal/offers/${params.offerId}`;

  const map: Record<AggregatorOfferEvent, { subject: string; heading: string; body: string; cta: string }> = {
    COUNTER: {
      subject: `Counter-offer for ${params.productName}`,
      heading: "We've sent you a counter-offer",
      body: "Our team has reviewed your offer and sent back a counter-proposal. Log in to review and respond.",
      cta: "Review Counter-Offer",
    },
    ACCEPT: {
      subject: `Offer accepted — ${params.productName}`,
      heading: "Your offer has been accepted",
      body: "Great news! We've accepted your offer. The next step is to sign the supply agreement — you'll receive it shortly.",
      cta: "View Offer",
    },
    REJECT: {
      subject: `Offer declined — ${params.productName}`,
      heading: "Your offer was not accepted",
      body: "Unfortunately, we were unable to move forward with this offer at this time. You're welcome to submit a new offer anytime.",
      cta: "Submit a New Offer",
    },
    SEND_AGREEMENT: {
      subject: `Agreement ready to sign — ${params.productName}`,
      heading: "Your supply agreement is ready",
      body: "We've prepared and uploaded the supply agreement for your offer. Please download it, sign it, and upload the signed copy from your portal.",
      cta: "Download & Sign Agreement",
    },
    APPROVE_AGREEMENT: {
      subject: `Agreement approved — ${params.productName}`,
      heading: "Your signed agreement has been approved",
      body: "We've reviewed and approved your signed agreement. You can now proceed with delivery. Advance payments and delivery tracking are available from your portal.",
      cta: "View Offer",
    },
    REJECT_AGREEMENT: {
      subject: `Agreement needs correction — ${params.productName}`,
      heading: "Your signed agreement was rejected",
      body: `We reviewed your signed agreement and it needs correction.${params.details ? ` <br/><br/><strong>Reason:</strong> ${params.details}` : ""} Please re-upload a corrected signed copy from your portal.`,
      cta: "Re-upload Signed Agreement",
    },
    ADVANCE: {
      subject: `Advance payment received — ${params.productName}`,
      heading: "Advance payment recorded",
      body: `We've recorded an advance payment toward your supply agreement.${params.details ? ` <br/><br/><strong>Amount:</strong> ${params.details}` : ""}`,
      cta: "View Payment Details",
    },
    DELIVERY: {
      subject: `Delivery recorded — ${params.productName}`,
      heading: "Delivery recorded",
      body: `A delivery has been recorded against your supply agreement.${params.details ? ` <br/><br/><strong>Details:</strong> ${params.details}` : ""}`,
      cta: "View Delivery Log",
    },
    PAYMENT: {
      subject: `Payment recorded — ${params.productName}`,
      heading: "Payment recorded",
      body: `A payment has been recorded on your offer.${params.details ? ` <br/><br/><strong>Amount:</strong> ${params.details}` : ""}`,
      cta: "View Payment Details",
    },
    COMPLETED: {
      subject: `Offer completed — ${params.productName}`,
      heading: "Your offer is now complete",
      body: "All deliveries and payments on this offer have been finalised. Thank you for supplying through Agro Hub — we look forward to working with you again.",
      cta: "View Offer",
    },
  };

  const { subject, heading, body, cta } = map[params.event];

  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">${heading}</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Hi ${params.name},</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:20px;">
      <p style="color:#95A5A6;font-size:12px;margin:0 0 4px;">Product</p>
      <p style="color:#FAFAFA;font-size:16px;font-weight:bold;margin:0 0 16px;">${params.productName}</p>
      <p style="color:#FAFAFA;font-size:14px;margin:0;line-height:1.6;">${body}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:#43A047;color:#FAFAFA;font-size:14px;font-weight:bold;padding:12px 32px;border-radius:8px;text-decoration:none;">${cta}</a>
    </div>
  `);

  await sendEmail({
    to: params.to,
    toName: params.name,
    subject: `${subject} — Agro Hub`,
    htmlBody: html,
  });
}

// ── Aggregator Welcome Email ──
export async function sendAggregatorWelcome(params: {
  to: string;
  name: string;
}) {
  const html = layout(`
    <h2 style="color:#FAFAFA;font-size:20px;margin:0 0 8px;">Welcome to Agro Hub!</h2>
    <p style="color:#95A5A6;font-size:14px;margin:0 0 20px;">Hi ${params.name}, your aggregator account has been created successfully.</p>
    <div style="background:#212F3D;border:1px solid #2C3E50;border-radius:12px;padding:20px;">
      <p style="color:#FAFAFA;font-size:14px;margin:0 0 12px;">With your account you can:</p>
      <ul style="color:#95A5A6;font-size:13px;padding-left:20px;margin:0;">
        <li style="margin-bottom:8px;">Submit offers to supply agricultural products</li>
        <li style="margin-bottom:8px;">Negotiate prices with our team</li>
        <li style="margin-bottom:8px;">Track delivery progress and payments</li>
        <li>Sign agreements digitally</li>
      </ul>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/aggregator/portal" style="display:inline-block;background:#43A047;color:#FAFAFA;font-size:14px;font-weight:bold;padding:12px 32px;border-radius:8px;text-decoration:none;">Go to Your Dashboard</a>
    </div>
  `);

  await sendEmail({
    to: params.to,
    toName: params.name,
    subject: "Welcome to Agro Hub — Aggregator Portal",
    htmlBody: html,
  });
}
