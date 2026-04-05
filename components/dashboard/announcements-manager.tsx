"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import NextImage from "next/image";
import { Plus, Pin, Eye, EyeOff, Trash2, Edit2, Image, Video, X, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CloudinaryUpload } from "@/components/dashboard/cloudinary-upload";
import { useToast } from "@/hooks/use-toast";
import { ToastList } from "@/components/shared/toast";

interface Announcement {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isActive: boolean;
  pinned: boolean;
  createdAt: Date;
}

interface Props {
  initialAnnouncements: Announcement[];
  initialTotal: number;
  pageSize: number;
}

type StatusFilter = "" | "active" | "hidden" | "pinned";

export function AnnouncementsManager({ initialAnnouncements, initialTotal, pageSize }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [viewItem, setViewItem] = useState<Announcement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { toasts, toast, dismiss } = useToast();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPage = useCallback(async (p: number, q: string, s: StatusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      if (s) params.set("status", s);
      const res = await fetch(`/api/dashboard/announcements?${params}`);
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data);
        setTotal(data.total);
        setPage(data.page);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPage(1, value, status);
    }, 300);
  }

  function handleStatusChange(s: StatusFilter) {
    setStatus(s);
    fetchPage(1, search, s);
  }

  // Optimistic update helper — updates a single announcement in the list
  function updateItem(id: string, patch: Partial<Announcement>) {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  // Optimistic remove helper
  function removeItem(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  async function handlePatch(id: string, data: Record<string, unknown>, label: string) {
    // Optimistic update
    updateItem(id, data as Partial<Announcement>);
    try {
      const res = await fetch(`/api/dashboard/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast(label, "success");
      } else {
        toast(result.error ?? `Failed to update`, "error");
        fetchPage(page, search, status); // Revert on failure
      }
    } catch {
      toast("Connection error", "error");
      fetchPage(page, search, status);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    // Optimistic remove
    removeItem(id);
    try {
      const res = await fetch(`/api/dashboard/announcements/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast("Announcement deleted", "success");
        // If current page is now empty and not page 1, go back
        if (announcements.length <= 1 && page > 1) {
          fetchPage(page - 1, search, status);
        }
      } else {
        toast(result.error ?? "Failed to delete", "error");
        fetchPage(page, search, status); // Revert on failure
      }
    } catch {
      toast("Connection error", "error");
      fetchPage(page, search, status);
    }
  }

  function handleSaved(isNew: boolean) {
    setShowAdd(false);
    setEditItem(null);
    toast(isNew ? "Announcement published" : "Announcement updated", "success");
    fetchPage(isNew ? 1 : page, search, status);
  }

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-agro-dark">Announcements</h1>
          <p className="font-body text-sm text-muted mt-0.5">{total} announcement{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-11 px-4 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm hover:bg-primary/90 transition-colors glow-emerald"
        >
          <Plus className="h-4 w-4" />
          Add Announcement
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search announcements…"
            className="w-full h-11 pl-9 pr-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
          <option value="pinned">Pinned</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-card p-12 text-center">
          <p className="font-body text-muted">
            {search || status ? "No announcements match your filters." : "No announcements yet. Create the first one."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onView={() => setViewItem(a)}
              onEdit={() => setEditItem(a)}
              onTogglePin={() => handlePatch(a.id, { pinned: !a.pinned }, a.pinned ? "Unpinned" : "Pinned")}
              onToggleVisibility={() => handlePatch(a.id, { isActive: !a.isActive }, a.isActive ? "Hidden from public" : "Now visible")}
              onDelete={() => handleDelete(a.id, a.title)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 gap-3">
          <button
            onClick={() => fetchPage(page - 1, search, status)}
            disabled={page <= 1 || loading}
            className="h-11 px-4 flex items-center gap-1.5 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="font-body text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchPage(page + 1, search, status)}
            disabled={page >= totalPages || loading}
            className="h-11 px-4 flex items-center gap-1.5 rounded-[8px] border border-gray-200 font-body text-sm text-agro-dark hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {showAdd && (
        <AnnouncementFormModal
          onClose={() => setShowAdd(false)}
          onSaved={() => handleSaved(true)}
        />
      )}
      {editItem && (
        <AnnouncementFormModal
          announcement={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => handleSaved(false)}
        />
      )}
      {viewItem && (
        <AnnouncementDetailModal
          announcement={viewItem}
          onClose={() => setViewItem(null)}
        />
      )}

      <ToastList toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function AnnouncementCard({ announcement: a, onView, onEdit, onTogglePin, onToggleVisibility, onDelete }: {
  announcement: Announcement;
  onView: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn(
      "bg-white rounded-[12px] border shadow-card overflow-hidden transition-opacity",
      a.pinned ? "border-primary/30" : "border-gray-200",
      !a.isActive && "opacity-60"
    )}>
      <div className="flex gap-4 p-4">
        {/* Thumbnail — click to view */}
        {a.mediaUrl && (
          <button
            type="button"
            onClick={onView}
            className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-[8px] overflow-hidden bg-gray-100 relative group"
            title="Click to view full content"
          >
            {a.mediaType === "video" ? (
              <>
                <video src={a.mediaUrl} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Video className="h-3.5 w-3.5 text-agro-dark" />
                  </div>
                </div>
              </>
            ) : (
              <NextImage src={a.mediaUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            )}
          </button>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={onView} className="text-left">
                <h3 className="font-body font-semibold text-agro-dark hover:text-primary transition-colors">{a.title}</h3>
              </button>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="font-body text-xs text-muted">{formatDate(a.createdAt)}</p>
                {a.pinned && (
                  <span className="flex items-center gap-1 text-xs font-body text-primary">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                )}
                {!a.isActive && (
                  <span className="text-xs font-body text-muted px-1.5 py-0.5 bg-gray-100 rounded-[4px]">Hidden</span>
                )}
                {a.mediaUrl && (
                  <span className="flex items-center gap-1 text-xs font-body text-muted">
                    {a.mediaType === "video" ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                    {a.mediaType}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onTogglePin}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-[8px] transition-colors",
                  a.pinned ? "text-primary hover:bg-primary/10" : "text-muted hover:bg-gray-100"
                )}
                title={a.pinned ? "Unpin" : "Pin"}
              >
                <Pin className="h-4 w-4" />
              </button>
              <button
                onClick={onToggleVisibility}
                className="h-11 w-11 flex items-center justify-center rounded-[8px] hover:bg-gray-100 transition-colors text-muted"
                title={a.isActive ? "Hide" : "Show"}
              >
                {a.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                onClick={onEdit}
                className="h-11 w-11 flex items-center justify-center rounded-[8px] hover:bg-gray-100 transition-colors text-muted"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="h-11 w-11 flex items-center justify-center rounded-[8px] hover:bg-red-50 transition-colors text-muted hover:text-status-cancelled"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-body text-sm text-muted whitespace-pre-wrap leading-relaxed line-clamp-2">{a.body}</p>
        </div>
      </div>
    </div>
  );
}

function AnnouncementDetailModal({ announcement: a, onClose }: {
  announcement: Announcement;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-agro-dark/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-2xl bg-white rounded-t-[16px] sm:rounded-[12px] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-lg text-agro-dark truncate">{a.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-body text-xs text-muted">{formatDate(a.createdAt)}</p>
              {a.pinned && (
                <span className="flex items-center gap-1 text-xs font-body text-primary">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
              {!a.isActive && (
                <span className="text-xs font-body text-muted px-1.5 py-0.5 bg-gray-100 rounded-[4px]">Hidden</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {a.mediaUrl && (
            <div className="bg-gray-100">
              {a.mediaType === "video" ? (
                <video src={a.mediaUrl} className="w-full aspect-video object-contain bg-black" controls />
              ) : (
                <div className="flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.mediaUrl} alt="" className="max-w-full max-h-[50vh] object-contain rounded-[8px]" />
                </div>
              )}
            </div>
          )}
          <div className="p-5">
            <p className="font-body text-sm text-agro-dark whitespace-pre-wrap leading-relaxed">{a.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementFormModal({ announcement, onClose, onSaved }: {
  announcement?: Announcement;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: announcement?.title ?? "",
    body: announcement?.body ?? "",
    isActive: announcement?.isActive ?? true,
    pinned: announcement?.pinned ?? false,
    mediaUrl: announcement?.mediaUrl ?? "",
    mediaType: announcement?.mediaType ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleMediaUploaded(url: string) {
    const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(url) || url.includes("/video/");
    setForm((f) => ({ ...f, mediaUrl: url, mediaType: isVideo ? "video" : "image" }));
  }

  function clearMedia() {
    setForm((f) => ({ ...f, mediaUrl: "", mediaType: "" }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = announcement
        ? `/api/dashboard/announcements/${announcement.id}`
        : "/api/dashboard/announcements";
      const method = announcement ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save");
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-agro-dark/40">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-agro-dark">
            {announcement ? "Edit Announcement" : "New Announcement"}
          </h2>
          <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-[6px] text-muted hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block font-body text-xs text-muted mb-1">Title *</label>
            <input required type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full h-11 px-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block font-body text-xs text-muted mb-1">Body *</label>
            <textarea required rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full px-3 py-3 rounded-[8px] bg-white border border-gray-200 text-agro-dark font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
          </div>

          {/* Media upload */}
          <div>
            <label className="block font-body text-xs text-muted mb-1">Attach Image or Video (optional)</label>
            {form.mediaUrl ? (
              <div className="relative rounded-[8px] border border-gray-200 overflow-hidden">
                {form.mediaType === "video" ? (
                  <video src={form.mediaUrl} className="w-full aspect-video object-contain bg-black" muted controls />
                ) : (
                  <NextImage src={form.mediaUrl} alt="" width={400} height={128} className="w-full h-32 object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 h-11 w-11 flex items-center justify-center rounded-full bg-agro-dark/60 text-frost-white hover:bg-agro-dark/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200">
                  <p className="font-body text-xs text-muted capitalize flex items-center gap-1">
                    {form.mediaType === "video" ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                    {form.mediaType} attached
                  </p>
                </div>
              </div>
            ) : (
              <CloudinaryUpload
                currentUrl=""
                onUploaded={handleMediaUploaded}
                accept="image/*,video/*"
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-primary" />
              <span className="font-body text-sm text-agro-dark">Published</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} className="accent-primary" />
              <span className="font-body text-sm text-agro-dark">Pinned</span>
            </label>
          </div>
          {error && <p className="text-status-cancelled text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-[8px] border border-gray-200 text-agro-dark font-body text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-[8px] bg-primary text-agro-dark font-display font-semibold text-sm disabled:opacity-60">
              {saving ? "Saving..." : announcement ? "Save Changes" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
