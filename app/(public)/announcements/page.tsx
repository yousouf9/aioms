import Image from "next/image";
import { getCachedAnnouncements } from "@/lib/cache";
import { formatDate } from "@/lib/utils";
import { Pin, Megaphone, Bell, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import Link from "next/link";

export default async function AnnouncementsPage() {
  const announcements = await getCachedAnnouncements();
  const pinned = announcements.filter((a) => a.pinned);
  const regular = announcements.filter((a) => !a.pinned);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-agro-dark rounded-[12px] p-8 sm:p-10 mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/15 mb-4">
          <Bell className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">Stay Updated</span>
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-frost-white mb-2">
          News & Announcements
        </h1>
        <p className="text-muted text-sm">Latest updates and important information from Agro Hub</p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-[12px] shadow-card p-16 text-center">
          <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="font-display font-semibold text-agro-dark text-lg mb-2">No announcements yet</p>
          <p className="text-sm text-muted mb-6">Check back soon for updates and news</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-[8px] bg-primary text-white font-display font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            Back to Home <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Pin className="h-4 w-4 text-primary" />
                <h2 className="font-display font-semibold text-sm text-primary uppercase tracking-wider">Pinned</h2>
              </div>
              <ScrollReveal>
                <div className="space-y-4">
                  {pinned.map((a) => (
                    <div key={a.id} className="bg-white rounded-[12px] border-2 border-primary/20 shadow-card overflow-hidden">
                      {a.mediaUrl && (
                        <div className="relative">
                          {a.mediaType === "video" ? (
                            <video src={a.mediaUrl} controls className="w-full max-h-64 object-cover" />
                          ) : (
                            <Image src={a.mediaUrl} alt="" width={800} height={400} className="w-full max-h-64 object-cover" />
                          )}
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-display font-bold text-xl text-agro-dark">{a.title}</h3>
                          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10">
                            <Pin className="h-3 w-3 text-primary" />
                            <span className="text-xs text-primary font-medium">Pinned</span>
                          </span>
                        </div>
                        <p className="text-sm text-muted-dark leading-relaxed whitespace-pre-wrap mb-3">{a.body}</p>
                        <p className="text-xs text-muted">{formatDate(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          )}

          {/* Regular */}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="h-4 w-4 text-muted" />
                  <h2 className="font-display font-semibold text-sm text-muted uppercase tracking-wider">Recent Updates</h2>
                </div>
              )}
              <ScrollReveal>
                <div className="space-y-4">
                  {regular.map((a) => (
                    <div key={a.id} className="bg-white rounded-[12px] border border-gray-200 shadow-card overflow-hidden">
                      {a.mediaUrl && (
                        <div className="relative">
                          {a.mediaType === "video" ? (
                            <video src={a.mediaUrl} controls className="w-full max-h-56 object-cover" />
                          ) : (
                            <Image src={a.mediaUrl} alt="" width={800} height={350} className="w-full max-h-56 object-cover" />
                          )}
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="hidden sm:flex shrink-0 flex-col items-center justify-center h-14 w-14 rounded-[10px] bg-gray-50 border border-gray-200">
                            <span className="font-display font-bold text-agro-dark text-lg leading-none">
                              {new Date(a.createdAt).getDate()}
                            </span>
                            <span className="text-xs text-muted uppercase">
                              {new Date(a.createdAt).toLocaleString("en", { month: "short" })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-lg text-agro-dark mb-2">{a.title}</h3>
                            <p className="text-sm text-muted-dark leading-relaxed whitespace-pre-wrap">{a.body}</p>
                            <p className="text-xs text-muted mt-3 sm:hidden">{formatDate(a.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
