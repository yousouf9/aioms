import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category");
    const search = searchParams.get("search");

    const products = await db.product.findMany({
      where: {
        isActive: true,
        isPublic: true,
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        unit: p.unit,
        sellingPrice: p.sellingPrice.toNumber(),
        category: p.category,
      })),
    });
  } catch (error) {
    console.error("[PUBLIC_PRODUCTS]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load products" },
      { status: 500 }
    );
  }
}
