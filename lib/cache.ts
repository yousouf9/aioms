import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";

// ─── Cache Tags ──────────────────────────────────────────────────────────────
export const CACHE_TAGS = {
  announcements: "announcements",
  products: "products",
  categories: "categories",
  stats: "stats",
  settings: "settings",
} as const;

const PURGE: { expire: number } = { expire: 0 };

// ─── Revalidation helpers ────────────────────────────────────────────────────
export function revalidateAnnouncements() {
  revalidateTag(CACHE_TAGS.announcements, PURGE);
  revalidateTag(CACHE_TAGS.stats, PURGE);
}

export function revalidateProducts() {
  revalidateTag(CACHE_TAGS.products, PURGE);
}

export function revalidateCategories() {
  revalidateTag(CACHE_TAGS.categories, PURGE);
}

export function revalidateStats() {
  revalidateTag(CACHE_TAGS.stats, PURGE);
}

export function revalidateSettings() {
  revalidateTag(CACHE_TAGS.settings, PURGE);
}

// ─── Cached data fetchers (used by public pages) ────────────────────────────

export const getCachedAnnouncements = unstable_cache(
  async (take?: number) => {
    return db.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      ...(take ? { take } : {}),
    });
  },
  ["announcements"],
  { tags: [CACHE_TAGS.announcements] }
);

export const getCachedCategories = unstable_cache(
  async () => {
    return db.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { isActive: true, isPublic: true } } } } },
    });
  },
  ["categories"],
  { tags: [CACHE_TAGS.categories] }
);

export const getCachedProducts = unstable_cache(
  async (categoryId?: string, take?: number) => {
    const products = await db.product.findMany({
      where: {
        isActive: true,
        isPublic: true,
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: { name: "asc" },
      ...(take ? { take } : {}),
      include: { category: { select: { id: true, name: true } } },
    });
    return products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
    }));
  },
  ["products"],
  { tags: [CACHE_TAGS.products], revalidate: 60 }
);

export const getCachedSettings = unstable_cache(
  async () => {
    return db.siteSettings.findUnique({ where: { id: "default" } });
  },
  ["settings"],
  { tags: [CACHE_TAGS.settings] }
);
