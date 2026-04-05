import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const categories = await db.productCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { isActive: true, isPublic: true } } } } },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      })),
    });
  } catch (error) {
    console.error("[PUBLIC_CATEGORIES]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load categories" },
      { status: 500 }
    );
  }
}
