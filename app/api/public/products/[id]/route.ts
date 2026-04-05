import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id, isActive: true, isPublic: true },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!product) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        sku: product.sku,
        unit: product.unit,
        sellingPrice: product.sellingPrice.toNumber(),
        category: product.category,
      },
    });
  } catch (error) {
    console.error("[PUBLIC_PRODUCT_DETAIL]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to load product" },
      { status: 500 }
    );
  }
}
