export const dynamic = "force-dynamic";

import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { BackToTop } from "@/components/public/back-to-top";
import { db } from "@/lib/db";

async function getSiteData() {
  const settings = await db.siteSettings.findUnique({ where: { id: "default" } });
  return {
    whatsapp: settings?.whatsapp ?? "",
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { whatsapp } = await getSiteData();

  return (
    <div className="min-h-screen flex flex-col bg-frost-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {whatsapp && <WhatsAppButton phone={whatsapp} />}
      <BackToTop />
    </div>
  );
}
